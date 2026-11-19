const languages = [
  ['en','English'],['af','Afrikaans'],['sq','Albanian'],['am','Amharic'],['ar','Arabic'],
  ['hy','Armenian'],['az','Azerbaijani'],['eu','Basque'],['bn','Bengali'],['bs','Bosnian'],
  ['bg','Bulgarian'],['ca','Catalan'],['zh','Chinese'],['zh-TW','Chinese (Traditional)'],
  ['hr','Croatian'],['cs','Czech'],['da','Danish'],['nl','Dutch'],['eo','Esperanto'],
  ['et','Estonian'],['fi','Finnish'],['fr','French'],['gl','Galician'],['ka','Georgian'],
  ['de','German'],['el','Greek'],['gu','Gujarati'],['ht','Haitian Creole'],['he','Hebrew'],
  ['hi','Hindi'],['hu','Hungarian'],['is','Icelandic'],['id','Indonesian'],['ga','Irish'],
  ['it','Italian'],['ja','Japanese'],['kn','Kannada'],['kk','Kazakh'],['ko','Korean'],
  ['ku','Kurdish'],['la','Latin'],['lv','Latvian'],['lt','Lithuanian'],['mk','Macedonian'],
  ['ms','Malay'],['ml','Malayalam'],['mt','Maltese'],['mr','Marathi'],['mn','Mongolian'],
  ['ne','Nepali'],['no','Norwegian'],['fa','Persian'],['pl','Polish'],['pt','Portuguese'],
  ['pa','Punjabi'],['ro','Romanian'],['ru','Russian'],['sr','Serbian'],['sk','Slovak'],
  ['sl','Slovenian'],['es','Spanish'],['sw','Swahili'],['sv','Swedish'],['tl','Tagalog'],
  ['ta','Tamil'],['te','Telugu'],['th','Thai'],['tr','Turkish'],['uk','Ukrainian'],
  ['ur','Urdu'],['uz','Uzbek'],['vi','Vietnamese'],['cy','Welsh'],['yo','Yoruba'],
  ['ps','Pashto'],['sd','Sindhi'],['si','Sinhala'],['lo','Lao'],['my','Myanmar'],
  ['km','Khmer'],['mg','Malagasy'],['haw','Hawaiian'],['hmn','Hmong'],['jw','Javanese'],
  ['su','Sundanese'],['ceb','Cebuano'],['so','Somali'],['xh','Xhosa'],['zu','Zulu'],
  ['sn','Shona'],['ny','Chichewa'],['rw','Kinyarwanda'],['ha','Hausa'],['ig','Igbo'],
  ['om','Oromo'],['am','Amharic'],['tn','Tswana'],['st','Sesotho'],['mi','Maori'],
  ['sm','Samoan'],['to','Tongan'],['fj','Fijian'],['ty','Tahitian'],['gd','Scottish Gaelic'],
  ['br','Breton'],['co','Corsican'],['lb','Luxembourgish'],['fo','Faroese'],['fy','Frisian'],
  ['yi','Yiddish'],['tt','Tatar'],['ba','Bashkir'],['be','Belarusian'],['ug','Uyghur'],
  ['dv','Divehi'],['bo','Tibetan'],['dz','Dzongkha'],['as','Assamese'],['or','Odia'],
  ['sat','Santali'],['ks','Kashmiri'],['mai','Maithili'],['bho','Bhojpuri'],['gom','Goan Konkani'],
  ['kok','Konkani'],['doi','Dogri'],['ne','Nepali'],['sa','Sanskrit'],['tok','Toki Pona']
];

const uniqueLanguages = languages.filter(([code], index) =>
  languages.findIndex(([existingCode]) => existingCode === code) === index
);
const options = uniqueLanguages.map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
const fromLang = document.getElementById('fromLang');
const toLang = document.getElementById('toLang');
const fileLang = document.getElementById('fileLang');
fromLang.innerHTML = options;
toLang.innerHTML = options;
fileLang.innerHTML = options;
fromLang.value = 'en';
toLang.value = 'es';
fileLang.value = 'es';

const sourceText = document.getElementById('sourceText');
const resultText = document.getElementById('resultText');
const translateBtn = document.getElementById('translateBtn');
const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function textChunks(text, size = 400) {
  const chunks = [];
  let index = 0;
  while (index < text.length) {
    let end = Math.min(index + size, text.length);
    if (end < text.length) {
      const nearBreak = text.lastIndexOf('\n', end);
      if (nearBreak > index) end = nearBreak + 1;
    }
    chunks.push(text.slice(index, end));
    index = end;
  }
  return chunks;
}

async function translateText(text, target, source = 'auto') {
  const sourceCode = normalizeLanguageCode(source);
  const targetCode = normalizeLanguageCode(target);
  if (sourceCode !== 'auto' && sourceCode === targetCode) return text;

  const translated = [];
  for (const chunk of textChunks(text)) {
    let lastError = null;

    try {
      const googleUrl =
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceCode)}&tl=${encodeURIComponent(targetCode)}&dt=t&q=${encodeURIComponent(chunk)}`;
      const googleResponse = await fetch(googleUrl);
      if (!googleResponse.ok) throw new Error('Google translation service unavailable');
      const googleData = await googleResponse.json();
      const googleText = Array.isArray(googleData?.[0])
        ? googleData[0].map(part => part[0] || '').join('')
        : '';
      if (googleText) {
        translated.push(googleText);
        continue;
      }
      lastError = new Error('Google translation returned no text');
    } catch (error) {
      lastError = error;
    }

    try {
      const myMemorySource = sourceCode === 'auto' ? '' : sourceCode;
      const pair = `${encodeURIComponent(myMemorySource)}|${encodeURIComponent(targetCode)}`;
      const myMemoryUrl =
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${pair}`;
      const myMemoryResponse = await fetch(myMemoryUrl);
      if (!myMemoryResponse.ok) throw new Error('Translation service unavailable');
      const myMemoryData = await myMemoryResponse.json();
      if (myMemoryData.responseStatus === 200 && myMemoryData.responseData?.translatedText) {
        translated.push(myMemoryData.responseData.translatedText);
        continue;
      }
      lastError = new Error(normalizeTranslationError(myMemoryData.responseDetails));
    } catch (error) {
      lastError = error;
    }

    throw lastError || new Error('This language pair is not available');
  }
  return translated.join('');
}

function normalizeLanguageCode(code) {
  if (!code || code === 'auto') return 'auto';
  const normalized = String(code).toLowerCase();
  const aliases = {
    'zh-tw':'zh-TW',
    'zh-cn':'zh-CN',
    'iw':'he',
    'in':'id',
    'ji':'yi',
    'jw':'jv',
    'gom':'kok',
    'bh':'bho',
    'nb':'no'
  };
  if (aliases[normalized]) return aliases[normalized];
  return normalized.replace('_', '-');
}

function normalizeTranslationError(message) {
  const text = String(message || '');
  if (/invalid language pair/i.test(text)) {
    return 'This language pair is not supported. Try a more common language or change the source language.';
  }
  if (/no content/i.test(text)) {
    return 'No translation content is available for this language pair.';
  }
  return text || 'Translation failed';
}

translateBtn.addEventListener('click', async () => {
  const text = sourceText.value.trim();
  if (!text) return showToast('Please enter text to translate');
  translateBtn.disabled = true;
  translateBtn.textContent = 'Translating...';
  try {
    resultText.classList.remove('placeholder');
    resultText.textContent = await translateText(text, toLang.value, fromLang.value);
  } catch (error) {
    resultText.textContent = 'Unable to translate. Please try again.';
    showToast(error.message);
  } finally {
    translateBtn.disabled = false;
    translateBtn.textContent = 'Translate';
  }
});

sourceText.addEventListener('input', () => {
  document.getElementById('charCount').textContent = `${sourceText.value.length} / 5000`;
});

document.getElementById('clearBtn').addEventListener('click', () => {
  sourceText.value = '';
  sourceText.dispatchEvent(new Event('input'));
  resultText.textContent = 'Translation';
  resultText.classList.add('placeholder');
  sourceText.focus();
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!resultText.textContent || resultText.textContent === 'Translation') return;
  try {
    await navigator.clipboard.writeText(resultText.textContent);
    showToast('Translation copied');
  } catch {
    showToast('Copy failed; select the text manually');
  }
});

const micBtn = document.getElementById('micBtn');
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let voiceRecognition = null;
  let liveTranslateTimer = null;
  let voiceBaseText = '';
  let voiceFinalText = '';

  micBtn.addEventListener('click', () => {
    if (voiceRecognition) {
      voiceRecognition.stop();
      voiceRecognition = null;
      return;
    }

    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = getSpeechLocale(fromLang.value);
    voiceBaseText = sourceText.value.trim();
    voiceFinalText = '';
    micBtn.classList.add('listening');
    micBtn.title = 'Listening...';

    voiceRecognition.onresult = event => {
      let interimText = '';
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const spokenText = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += `${spokenText} `;
        else interimText += spokenText;
      }

      voiceFinalText = `${voiceFinalText}${finalText}`.trim();
      const spokenText = `${voiceFinalText}${interimText ? ` ${interimText}` : ''}`.trim();
      sourceText.value = voiceBaseText ? `${voiceBaseText} ${spokenText}` : spokenText;
      sourceText.dispatchEvent(new Event('input'));

      window.clearTimeout(liveTranslateTimer);
      liveTranslateTimer = window.setTimeout(async () => {
        if (!sourceText.value.trim()) return;
        try {
          resultText.classList.remove('placeholder');
          resultText.textContent = await translateText(sourceText.value, toLang.value, fromLang.value);
        } catch (error) {
          showToast(error.message);
        }
      }, 650);
    };
    voiceRecognition.onerror = event => showToast(event.error === 'not-allowed' ? 'Microphone permission is required' : 'Could not recognize speech');
    voiceRecognition.onend = () => {
      micBtn.classList.remove('listening');
      micBtn.title = 'Speak';
      voiceRecognition = null;
    };
    voiceRecognition.start();
  });
} else {
  micBtn.disabled = true;
  micBtn.title = 'Voice input is not supported by this browser';
}

function getSpeechLocale(code) {
  const locales = {
    en:'en-US', es:'es-ES', fr:'fr-FR', de:'de-DE', it:'it-IT', pt:'pt-PT',
    ar:'ar-SA', hi:'hi-IN', pa:'pa-IN', ur:'ur-PK', bn:'bn-BD', ta:'ta-IN',
    te:'te-IN', mr:'mr-IN', gu:'gu-IN', kn:'kn-IN', ml:'ml-IN', zh:'zh-CN',
    'zh-TW':'zh-TW', ja:'ja-JP', ko:'ko-KR', tr:'tr-TR', ru:'ru-RU',
    id:'id-ID', vi:'vi-VN', th:'th-TH', ms:'ms-MY', fa:'fa-IR', nl:'nl-NL',
    sv:'sv-SE', pl:'pl-PL', uk:'uk-UA', el:'el-GR', he:'he-IL'
  };
  return locales[code] || code || 'en-US';
}

document.getElementById('swapBtn').addEventListener('click', () => {
  const oldFrom = fromLang.value;
  fromLang.value = toLang.value;
  toLang.value = oldFrom;
  if (resultText.textContent !== 'Translation') {
    sourceText.value = resultText.textContent;
    sourceText.dispatchEvent(new Event('input'));
    resultText.textContent = 'Translation';
    resultText.classList.add('placeholder');
  }
});

const textTab = document.getElementById('textTab');
const fileTab = document.getElementById('fileTab');
function showTab(file) {
  document.getElementById('textView').style.display = file ? 'none' : 'block';
  document.getElementById('fileView').style.display = file ? 'block' : 'none';
  textTab.classList.toggle('active', !file);
  fileTab.classList.toggle('active', file);
  textTab.setAttribute('aria-selected', String(!file));
  fileTab.setAttribute('aria-selected', String(file));
}
textTab.addEventListener('click', () => showTab(false));
fileTab.addEventListener('click', () => showTab(true));

const fileInput = document.getElementById('fileInput');
const fileStatus = document.getElementById('fileStatus');
const translateFileBtn = document.getElementById('translateFileBtn');
const downloadBtn = document.getElementById('downloadBtn');
const filePreview = document.getElementById('filePreview');
let originalFileText = '';
let translatedFileText = '';
let selectedFileName = 'document';

async function readFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (['txt','md','json','csv','rtf'].includes(extension)) return await file.text();
  if (['html','htm'].includes(extension)) {
    const html = await file.text();
    const documentElement = new DOMParser().parseFromString(html, 'text/html');
    return documentElement.body.textContent.replace(/[ \t]+/g, ' ').trim();
  }
  if (extension === 'docx') {
    if (!window.mammoth) throw new Error('DOCX reader is still loading');
    const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }
  if (extension === 'pdf') {
    if (!window.pdfjsLib) throw new Error('PDF reader is still loading');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = '';
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let line = '';
      const pageLines = [];
      let previousY = null;
      for (const item of content.items) {
        if (previousY !== null && Math.abs(item.transform[5] - previousY) > 3) {
          pageLines.push(line.trim());
          line = '';
        }
        line += (line ? ' ' : '') + item.str;
        previousY = item.transform[5];
      }
      if (line.trim()) pageLines.push(line.trim());
      text += pageLines.join('\n') + '\n\n';
    }
    return text.trim();
  }
  if (['xlsx','xls'].includes(extension)) {
    if (!window.XLSX) throw new Error('Spreadsheet reader is still loading');
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return workbook.SheetNames.map(name => {
      return `${name}\n${window.XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`;
    }).join('\n\n');
  }
  if (extension === 'pptx') {
    if (!window.JSZip) throw new Error('Presentation reader is still loading');
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const slideNames = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a,b) => {
      const aNumber = Number(a.match(/slide(\d+)/)[1]);
      const bNumber = Number(b.match(/slide(\d+)/)[1]);
      return aNumber - bNumber;
    });
    const slides = [];
    for (const name of slideNames) {
      const xml = await zip.file(name).async('text');
      const slideDocument = new DOMParser().parseFromString(xml, 'application/xml');
      const slideText = Array.from(slideDocument.getElementsByTagNameNS('*', 't')).map(node => node.textContent).join('\n');
      if (slideText.trim()) slides.push(slideText);
    }
    return slides.join('\n\n');
  }
  if (['png','jpg','jpeg','webp'].includes(extension)) {
    if (!window.Tesseract) throw new Error('Image text reader is still loading');
    fileStatus.textContent = 'Reading text from image...';
    const result = await window.Tesseract.recognize(file, 'eng');
    return result.data.text;
  }
  throw new Error('Unsupported file type');
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) return showToast('Please select a file smaller than 15 MB');
  selectedFileName = file.name.replace(/\.[^.]+$/, '') || 'document';
  document.getElementById('uploadTitle').textContent = file.name;
  fileStatus.textContent = 'Reading file...';
  translateFileBtn.disabled = true;
  downloadBtn.disabled = true;
  filePreview.hidden = true;
  originalFileText = '';
  translatedFileText = '';
  try {
    originalFileText = await readFile(file);
    if (!originalFileText.trim()) throw new Error('No readable text found in this file');
    fileStatus.textContent = `${file.name} · ${originalFileText.length.toLocaleString()} characters`;
    translateFileBtn.disabled = false;
  } catch (error) {
    fileStatus.textContent = error.message;
    showToast(error.message);
  }
});

translateFileBtn.addEventListener('click', async () => {
  translateFileBtn.disabled = true;
  translateFileBtn.textContent = 'Translating...';
  fileStatus.textContent = 'Translating document...';
  try {
    translatedFileText = await translateText(originalFileText, fileLang.value);
    fileStatus.textContent = 'Translation complete';
    filePreview.textContent = translatedFileText;
    filePreview.hidden = false;
    downloadBtn.disabled = false;
    showToast('File translated');
  } catch (error) {
    fileStatus.textContent = error.message;
    showToast(error.message);
  } finally {
    translateFileBtn.disabled = false;
    translateFileBtn.textContent = 'Translate file';
  }
});

downloadBtn.addEventListener('click', () => {
  if (!translatedFileText) return;
  const format = document.getElementById('downloadFormat').value;
  let blob;
  let extension = format;

  if (format === 'html') {
    blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>Translated Document</title></head><body><pre>${escapeHtml(translatedFileText)}</pre></body></html>`], { type: 'text/html;charset=utf-8' });
  } else if (format === 'pdf') {
    if (!window.jspdf) return showToast('PDF writer is still loading');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit:'pt', format:'a4' });
    const lines = pdf.splitTextToSize(translatedFileText, 520);
    let y = 50;
    for (const line of lines) {
      if (y > 790) {
        pdf.addPage();
        y = 50;
      }
      pdf.text(line, 40, y);
      y += 16;
    }
    blob = pdf.output('blob');
  } else {
    blob = new Blob([translatedFileText], { type: 'text/plain;charset=utf-8' });
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${selectedFileName}-${fileLang.value}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
  showToast('Download started');
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  })[character]);
}
