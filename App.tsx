import React, { useState, useCallback, ChangeEvent, DragEvent, useEffect } from 'react';
import { ConversionStatus, TableData } from './types';
import { convertPdfTextToTableData } from './services/geminiService';
import { PdfIcon, ExcelIcon, UploadIcon, SpinnerIcon, ErrorIcon, CheckCircleIcon, LogoIcon, TrashIcon, MergeIcon } from './components/icons';

// Make libraries available from global scope (loaded via CDN)
declare const pdfjsLib: any;
declare const XLSX: any;
declare const pdfLib: any;

const FileUpload: React.FC<{ onFilesSelect: (files: File[]) => void; disabled: boolean, multiple?: boolean, description?: string }> = ({ onFilesSelect, disabled, multiple = true, description }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
      if (pdfFiles.length > 0) {
        onFilesSelect(pdfFiles);
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const pdfFiles = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
       if (pdfFiles.length > 0) {
        onFilesSelect(pdfFiles);
      }
    }
    e.target.value = '';
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative w-full max-w-2xl p-10 border-4 border-dashed rounded-3xl transition-all duration-300 ${isDragging ? 'border-indigo-400 bg-indigo-50 scale-105' : 'border-gray-300 bg-white'} ${disabled ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:border-indigo-400'}`}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".pdf"
        multiple={multiple}
        onChange={handleFileChange}
        disabled={disabled}
      />
      <label htmlFor="file-upload" className={`flex flex-col items-center justify-center space-y-6 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <UploadIcon />
        <p className="text-2xl font-bold text-gray-800">فایل‌های PDF را اینجا بکشید و رها کنید</p>
        <p className="text-gray-500">{description}</p>
        <span className="px-8 py-3 text-lg text-white bg-indigo-600 rounded-full font-semibold shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105">
          انتخاب فایل‌ها
        </span>
      </label>
    </div>
  );
};

const StatusDisplay: React.FC<{ 
    status: ConversionStatus; 
    error: string | null; 
    onDownload: () => void; 
    onReset: () => void; 
    onDownloadMergedPdf: () => void;
    onContinueToConvert: () => Promise<void>;
}> = ({ status, error, onDownload, onReset, onDownloadMergedPdf, onContinueToConvert }) => {
    const statusConfig = {
        [ConversionStatus.MERGING]: { icon: <SpinnerIcon />, title: "در حال ادغام فایل‌ها...", message: "لطفاً کمی صبر کنید، فایل‌های PDF شما در حال یکی شدن هستند.", bgColor: "bg-blue-50", borderColor: "border-blue-200", titleColor: "text-blue-800" },
        [ConversionStatus.MERGE_SUCCESS]: { icon: <CheckCircleIcon />, title: "ادغام با موفقیت انجام شد!", message: "فایل PDF ادغام شده شما آماده دانلود است.", bgColor: "bg-green-50", borderColor: "border-green-200", titleColor: "text-green-800" },
        [ConversionStatus.POST_MERGE]: { icon: <CheckCircleIcon />, title: "ادغام با موفقیت انجام شد!", message: "می‌توانید فایل PDF ادغام شده را دانلود کنید، یا برای تبدیل به اکسل ادامه دهید.", bgColor: "bg-green-50", borderColor: "border-green-200", titleColor: "text-green-800" },
        [ConversionStatus.PROCESSING]: { icon: <SpinnerIcon />, title: "در حال پردازش...", message: "هوش مصنوعی در حال استخراج جدول از فایل شماست. این کار ممکن است کمی طول بکشد.", bgColor: "bg-blue-50", borderColor: "border-blue-200", titleColor: "text-blue-800" },
        [ConversionStatus.SUCCESS]: { icon: <CheckCircleIcon />, title: "تبدیل با موفقیت انجام شد!", message: "فایل اکسل شما آماده دانلود است.", bgColor: "bg-green-50", borderColor: "border-green-200", titleColor: "text-green-800" },
        [ConversionStatus.ERROR]: { icon: <ErrorIcon />, title: "خطا در پردازش", message: error || 'یک خطای ناشناخته رخ داد.', bgColor: "bg-red-50", borderColor: "border-red-200", titleColor: "text-red-800" }
    };
    
    const currentStatus = statusConfig[status];
    if(!currentStatus) return null;

    return (
        <div className={`flex flex-col items-center text-center p-8 ${currentStatus.bgColor} border ${currentStatus.borderColor} rounded-3xl w-full max-w-2xl shadow-lg`}>
            {currentStatus.icon}
            <p className={`text-2xl font-bold ${currentStatus.titleColor} mt-4`}>{currentStatus.title}</p>
            <p className="text-gray-600 mt-2 break-all">{currentStatus.message}</p>
            
            {status === ConversionStatus.MERGE_SUCCESS && (
                <div className="flex flex-col items-center w-full mt-6 space-y-3">
                    <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
                        <button onClick={onDownloadMergedPdf} className="flex items-center justify-center w-full sm:w-auto px-6 py-3 text-white bg-red-600 rounded-full hover:bg-red-700 transition-transform transform hover:scale-105 shadow-md">
                            <PdfIcon className="text-white !h-6 !w-6"/> <span className="mr-2 font-semibold">دانلود PDF ادغام شده</span>
                        </button>
                        <button onClick={onReset} className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors font-semibold">شروع مجدد</button>
                    </div>
                </div>
            )}

            {status === ConversionStatus.POST_MERGE && (
                 <div className="flex flex-col items-center w-full mt-6 space-y-3">
                    <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
                        <button onClick={onDownloadMergedPdf} className="flex items-center justify-center w-full sm:w-auto px-6 py-3 text-white bg-red-600 rounded-full hover:bg-red-700 transition-transform transform hover:scale-105 shadow-md">
                            <PdfIcon className="text-white !h-6 !w-6"/> <span className="mr-2 font-semibold">دانلود PDF ادغام شده</span>
                        </button>
                        <button onClick={onContinueToConvert} className="flex items-center justify-center w-full sm:w-auto px-6 py-3 text-white bg-indigo-600 rounded-full hover:bg-indigo-700 transition-transform transform hover:scale-105 shadow-md">
                            <ExcelIcon /> <span className="mr-2 font-semibold">ادامه برای تبدیل به اکسل</span>
                        </button>
                    </div>
                     <button onClick={onReset} className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors font-semibold">شروع مجدد</button>
                </div>
            )}

            {status === ConversionStatus.SUCCESS && (
                <div className="flex flex-col items-center w-full">
                    <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 sm:space-x-reverse mt-6">
                        <button onClick={onDownload} className="flex items-center justify-center w-full sm:w-auto px-6 py-3 text-white bg-green-600 rounded-full hover:bg-green-700 transition-transform transform hover:scale-105 shadow-md">
                            <ExcelIcon /> <span className="mr-2 font-semibold">دانلود فایل اکسل</span>
                        </button>
                         <button onClick={onReset} className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors font-semibold">تبدیل فایل دیگر</button>
                    </div>
                </div>
            )}
            {status === ConversionStatus.ERROR && (<button onClick={onReset} className="mt-6 px-8 py-3 text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors font-semibold">تلاش دوباره</button>)}
        </div>
    );
};

const MainSelection: React.FC<{ onSelectMode: (mode: 'CONVERT' | 'MERGE') => void }> = ({ onSelectMode }) => (
    <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-12">
            <div className="flex justify-center items-center gap-4 mb-4">
                <LogoIcon />
                <h1 className="text-5xl font-extrabold text-gray-800">ابزارهای PDF</h1>
            </div>
            <p className="text-xl text-gray-600 mt-4 max-w-2xl mx-auto">ابزار مورد نظر خود را برای کار با فایل‌های PDF انتخاب کنید</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-200 flex flex-col items-center text-center transition-transform transform hover:scale-105 hover:shadow-2xl">
                <div className="p-4 bg-indigo-100 rounded-full"><ExcelIcon className="h-10 w-10 text-indigo-600" /></div>
                <h2 className="text-2xl font-bold text-gray-800 mt-6">تبدیل PDF به اکسل</h2>
                <p className="text-gray-600 mt-2 flex-grow">فایل‌های PDF حاوی جدول را به صفحات گسترده اکسل تبدیل کنید. امکان ادغام خودکار چند فایل وجود دارد.</p>
                <button onClick={() => onSelectMode('CONVERT')} className="mt-8 px-10 py-3 text-lg text-white bg-indigo-600 rounded-full font-semibold shadow-lg hover:bg-indigo-700 transition-all">انتخاب ابزار</button>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-200 flex flex-col items-center text-center transition-transform transform hover:scale-105 hover:shadow-2xl">
                <div className="p-4 bg-teal-100 rounded-full"><MergeIcon className="h-10 w-10 text-teal-600" /></div>
                <h2 className="text-2xl font-bold text-gray-800 mt-6">ادغام فایل‌های PDF</h2>
                <p className="text-gray-600 mt-2 flex-grow">چندین فایل PDF را انتخاب کرده و به ترتیب دلخواه در یک فایل واحد ترکیب کنید.</p>
                <button onClick={() => onSelectMode('MERGE')} className="mt-8 px-10 py-3 text-lg text-white bg-teal-600 rounded-full font-semibold shadow-lg hover:bg-teal-700 transition-all">انتخاب ابزار</button>
            </div>
        </div>
    </div>
);

function App() {
    const [mode, setMode] = useState<'IDLE' | 'CONVERT' | 'MERGE'>('IDLE');
    const [files, setFiles] = useState<File[]>([]);
    const [status, setStatus] = useState<ConversionStatus>(ConversionStatus.IDLE);
    const [error, setError] = useState<string | null>(null);
    const [excelData, setExcelData] = useState<Blob | null>(null);
    const [finalFileName, setFinalFileName] = useState<string>('converted');
    const [mergedPdf, setMergedPdf] = useState<File | null>(null);
    const [conversionCount, setConversionCount] = useState<number>(0);

    useEffect(() => {
        const storedCount = localStorage.getItem('conversionCount');
        if (storedCount) {
            setConversionCount(parseInt(storedCount, 10) || 0);
        }
    }, []);

    const handleFilesSelect = (selectedFiles: File[]) => setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
    const removeFile = (index: number) => setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));

    const resetState = () => {
        setFiles([]);
        setStatus(ConversionStatus.IDLE);
        setError(null);
        setExcelData(null);
        setFinalFileName('converted');
        setMergedPdf(null);
        setMode('IDLE');
    };

    const handleBackToSelection = () => {
        setFiles([]);
        setStatus(ConversionStatus.IDLE);
        setError(null);
        setExcelData(null);
        setFinalFileName('converted');
        setMergedPdf(null);
        setMode('IDLE');
    };
    
    const processPdf = useCallback(async (fileToProcess: File) => {
        setStatus(ConversionStatus.PROCESSING);
        try {
            if (typeof pdfjsLib === 'undefined') throw new Error("pdf.js library is not loaded.");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs`;

            const arrayBuffer = await fileToProcess.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const numPages = pdf.numPages;
            let fullText = '';
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n\n';
            }

            const tableData: TableData = await convertPdfTextToTableData(fullText);
            
            if (!tableData || !tableData.headers || !tableData.rows) throw new Error("هوش مصنوعی نتوانست جدول معتبری استخراج کند. لطفاً محتوای PDF را بررسی کنید.");
            if (typeof XLSX === 'undefined') throw new Error("xlsx library is not loaded.");

            const worksheet = XLSX.utils.aoa_to_sheet([tableData.headers, ...tableData.rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheet.sheet" });

            setExcelData(blob);
            setStatus(ConversionStatus.SUCCESS);
            setConversionCount(prevCount => {
                const newCount = prevCount + 1;
                localStorage.setItem('conversionCount', String(newCount));
                return newCount;
            });
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'یک خطای ناشناخته در هنگام تبدیل رخ داد.');
            setStatus(ConversionStatus.ERROR);
        }
    }, []);

    const handleProcessRequest = useCallback(async () => {
        if (files.length === 0) return;
        setError(null);
        setExcelData(null);

        if (files.length === 1) {
            setFinalFileName(files[0].name.split('.').slice(0, -1).join('.'));
            await processPdf(files[0]);
        } else {
             setStatus(ConversionStatus.MERGING);
             try {
                if(typeof pdfLib === 'undefined') throw new Error('pdf-lib is not loaded.');
                const { PDFDocument } = pdfLib;
                const mergedPdfDoc = await PDFDocument.create();

                for (const file of files) {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await PDFDocument.load(arrayBuffer);
                    const copiedPages = await mergedPdfDoc.copyPages(pdf, pdf.getPageIndices());
                    copiedPages.forEach(page => mergedPdfDoc.addPage(page));
                }

                const mergedPdfBytes = await mergedPdfDoc.save();
                const mergedPdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
                const mergedFile = new File([mergedPdfBlob], "merged.pdf", { type: "application/pdf" });
                
                setMergedPdf(mergedFile);
                setStatus(ConversionStatus.POST_MERGE);
             } catch (err: any) {
                console.error(err);
                setError(err.message || 'خطا در هنگام ادغام فایل‌های PDF رخ داد.');
                setStatus(ConversionStatus.ERROR);
             }
        }
    }, [files, processPdf]);

    const handleMergeOnlyRequest = useCallback(async () => {
        if (files.length <= 1) return;
        setError(null);
        setStatus(ConversionStatus.MERGING);
         try {
            if(typeof pdfLib === 'undefined') throw new Error('pdf-lib is not loaded.');
            const { PDFDocument } = pdfLib;
            const mergedPdfDoc = await PDFDocument.create();

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdfDoc.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(page => mergedPdfDoc.addPage(page));
            }

            const mergedPdfBytes = await mergedPdfDoc.save();
            const mergedPdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            const mergedFile = new File([mergedPdfBlob], "merged_files.pdf", { type: "application/pdf" });
            
            setMergedPdf(mergedFile);
            setStatus(ConversionStatus.MERGE_SUCCESS);
         } catch (err: any) {
            console.error(err);
            setError(err.message || 'خطا در هنگام ادغام فایل‌های PDF رخ داد.');
            setStatus(ConversionStatus.ERROR);
         }
    }, [files]);
    
    const handleDownloadMergedPdf = () => {
        if (!mergedPdf) return;
        const url = window.URL.createObjectURL(mergedPdf);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged_files.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleContinueToConvert = async () => {
        if (!mergedPdf) return;
        setFinalFileName('merged_files');
        await processPdf(mergedPdf);
    };

    const handleDownload = () => {
        if (!excelData) return;
        const url = window.URL.createObjectURL(excelData);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${finalFileName}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    const isProcessing = status === ConversionStatus.PROCESSING || status === ConversionStatus.MERGING;

    const renderWorkflowUI = () => {
        const title = mode === 'CONVERT' ? 'تبدیل PDF به اکسل' : 'ادغام فایل‌های PDF';
        const description = mode === 'CONVERT' 
            ? 'می‌توانید چند فایل را برای ادغام و تبدیل همزمان انتخاب کنید' 
            : 'برای ادغام، حداقل دو فایل PDF را انتخاب کنید';

        return (
            <>
                <header className="text-center mb-12">
                     <div className="flex justify-center items-center gap-4 mb-4">
                        <LogoIcon />
                        <h1 className="text-5xl font-extrabold text-gray-800">{title}</h1>
                    </div>
                </header>
                 <main className="w-full flex flex-col items-center justify-center">
                    {status === ConversionStatus.IDLE && files.length === 0 && (
                        <FileUpload onFilesSelect={handleFilesSelect} disabled={isProcessing} description={description} />
                    )}

                    {files.length > 0 && status === ConversionStatus.IDLE && (
                        <div className="w-full max-w-2xl p-8 bg-white rounded-3xl shadow-lg">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">فایل‌های انتخاب شده</h2>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
                                        <div className="flex items-center min-w-0"> <PdfIcon />
                                            <div className="mr-3 flex flex-col min-w-0">
                                                <span className="font-medium text-gray-800 truncate">{file.name}</span>
                                                <span className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFile(index)} className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"><TrashIcon /></button>
                                    </div>
                                ))}
                            </div>
                            
                            {mode === 'CONVERT' && (
                                <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 sm:space-x-reverse mt-6 justify-center">
                                    <button onClick={handleProcessRequest} disabled={isProcessing} className="w-full sm:w-auto flex items-center justify-center px-8 py-3 text-white bg-indigo-600 rounded-full hover:bg-indigo-700 disabled:bg-gray-400 transition-all transform hover:scale-105 shadow-lg font-semibold">
                                        {files.length > 1 ? <><ExcelIcon /><span className="mr-2">ادغام و تبدیل</span></> : 'شروع تبدیل'}
                                    </button>
                                    <button onClick={() => setFiles([])} disabled={isProcessing} className="w-full sm:w-auto px-8 py-3 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-50 transition-colors font-semibold">لغو</button>
                                </div>
                            )}

                             {mode === 'MERGE' && (
                                <div className="flex flex-col items-center space-y-4 mt-6">
                                    <button onClick={handleMergeOnlyRequest} disabled={isProcessing || files.length < 2} className="w-full sm:w-auto flex items-center justify-center px-8 py-3 text-white bg-teal-600 rounded-full hover:bg-teal-700 disabled:bg-gray-400 transition-all transform hover:scale-105 shadow-lg font-semibold">
                                        <MergeIcon /><span className="mr-2">شروع ادغام</span>
                                    </button>
                                    {files.length < 2 && <p className="text-sm text-red-600">برای ادغام حداقل ۲ فایل نیاز است.</p>}
                                    <button onClick={() => setFiles([])} disabled={isProcessing} className="px-8 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium">لغو</button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {status !== ConversionStatus.IDLE && (
                        <StatusDisplay status={status} error={error} onDownload={handleDownload} onReset={resetState} onDownloadMergedPdf={handleDownloadMergedPdf} onContinueToConvert={handleContinueToConvert} />
                    )}
                </main>
                <div className="text-center mt-8">
                     <button onClick={handleBackToSelection} className="text-indigo-600 hover:text-indigo-800 font-semibold">&larr; بازگشت به انتخاب ابزار</button>
                </div>
            </>
        )
    }

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center p-4 selection:bg-indigo-100">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-white" style={{clipPath: 'polygon(0 0, 100% 0, 100% 40%, 0 60%)'}}></div>
            <div className="relative z-10 w-full">
                {mode === 'IDLE' ? <MainSelection onSelectMode={setMode} /> : renderWorkflowUI()}
                <footer className="text-center mt-16 text-gray-500">
                    <p>ساخته شده توسط واحد IT تراز حساب</p>
                    <p className="mt-2 text-sm">تعداد تبدیل‌های موفق: {conversionCount}</p>
                </footer>
            </div>
        </div>
    );
}

export default App;