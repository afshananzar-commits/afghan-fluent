import * as XLSX from 'xlsx';
import { createHash } from 'node:crypto';

const DEFAULT_SHARE_URL = 'https://1drv.ms/x/c/b8c1626a85543abb/IQB5FNwRQQKxSKozDKoLka4oAUfeygeTsiwiENXs2YzimDg';

function cleanRows(rows){
  return rows
    .slice(1)
    .filter(row => row && row.some(value => value !== '' && value !== null && value !== undefined))
    .map(row => row.map(value => value === undefined || value === null ? '' : value));
}

function findSheet(workbook, wanted){
  const name = workbook.SheetNames.find(n => n.toLowerCase() === wanted.toLowerCase());
  if(!name) throw new Error(`Tabblad ${wanted} ontbreekt in Excel.`);
  return workbook.Sheets[name];
}

async function downloadWorkbook(shareUrl){
  const separator = shareUrl.includes('?') ? '&' : '?';
  const encodedShare = 'u!' + Buffer.from(shareUrl, 'utf8').toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  const candidates = [
    `${shareUrl}${separator}download=1`,
    `${shareUrl}${separator}download=1&redeem=1`,
    `https://api.onedrive.com/v1.0/shares/${encodedShare}/root/content`
  ];
  let lastError;
  for(const url of candidates){
    try{
      const response = await fetch(url, {redirect:'follow', headers:{'User-Agent':'Mozilla/5.0 Afghan-Fluent/1.0','Accept':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*'}});
      if(!response.ok) throw new Error(`OneDrive antwoordde met ${response.status}.`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const type = response.headers.get('content-type') || '';
      const looksZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
      if(!looksZip && type.includes('text/html')) throw new Error('OneDrive gaf een webpagina terug in plaats van het Excel-bestand. Controleer of delen op “Iedereen met de link” staat.');
      if(buffer.length < 1000) throw new Error('Het opgehaalde Excel-bestand is onverwacht klein.');
      return buffer;
    }catch(error){ lastError = error; }
  }
  throw lastError || new Error('Excel kon niet worden gedownload.');
}

export default async function handler(req, res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  try{
    const shareUrl = process.env.ONEDRIVE_XLSX_URL || DEFAULT_SHARE_URL;
    const buffer = await downloadWorkbook(shareUrl);
    const workbook = XLSX.read(buffer, {type:'buffer', cellDates:false});
    const vocabularyRows = XLSX.utils.sheet_to_json(findSheet(workbook,'Vocabulary'), {header:1, defval:'', raw:false});
    const sentenceRows = XLSX.utils.sheet_to_json(findSheet(workbook,'Sentences'), {header:1, defval:'', raw:false});
    const vocabulary = cleanRows(vocabularyRows);
    const sentences = cleanRows(sentenceRows);
    if(!vocabulary.length || !sentences.length) throw new Error('Vocabulary of Sentences bevat geen gegevens.');
    const version = createHash('sha256').update(JSON.stringify([vocabulary,sentences])).digest('hex').slice(0,20);
    res.status(200).json({source:'OneDrive Excel',syncedAt:new Date().toISOString(),version,vocabulary,sentences});
  }catch(error){
    res.status(502).json({error:error?.message || 'Synchronisatie met OneDrive mislukt.'});
  }
}
