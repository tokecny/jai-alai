// This file is module for offline service such as save file, read file, etc with local storage or indexedDB.
// Author : Waragon P.

// ฟังก์ชันบันทึกข้อมูลใน Local Storage
function saveDataToLocalStorage(key: string, value: any) {
    // แปลงข้อมูลเป็น string ก่อนบันทึก
    localStorage.setItem(key, JSON.stringify(value));
}

// ฟังก์ชันดึงข้อมูลจาก Local Storage
function getDataFromLocalStorage(key: string) {
    const value = localStorage.getItem(key);
    if (value) {
        try {
            // แปลงข้อมูลกลับจาก string เป็นค่าเดิม
            return JSON.parse(value);
        } catch (e) {
            console.error("Error parsing data from localStorage", e);
            return null;
        }
    }
    return null; // ถ้าไม่มีข้อมูลหรือเป็น null
}

function saveDataToIndexedDB(data:any, DBname:string) {
    // Create request to open a indexed database
    const IDBrequest: IDBOpenDBRequest = window.indexedDB.open(DBname);
  
    // If error
    IDBrequest.onerror = function(event) {
        console.log("IndexedDB error: " + (event.target as any).errorCode);
    };
  
    // If upgrade needed
    IDBrequest.onupgradeneeded = function(event) {
        const db = IDBrequest.result;
        if (!db.objectStoreNames.contains("data")) {
            db.createObjectStore("data");
        }
    };
  
    // If success
    IDBrequest.onsuccess = function(event) {

        const db = IDBrequest.result;
  
        const transaction = db.transaction(["data"], "readwrite");
        const objectStore: IDBObjectStore = transaction.objectStore("data");
        const request = objectStore.add(data, new Date().getTime());

        request.onsuccess = function(event) {
            console.log("Data has been added to your database.");
        };

        transaction.oncomplete = function(event) {
            db.close();
        };
        
    };

  }

function getDataFromIndexedDB(DBname:string, DBversion:number, DBstore:string) {

    // Create request to open a indexed database
    const IDBrequest: IDBRequest = window.indexedDB.open(DBname, DBversion);

    // If error
    IDBrequest.onerror = function(event) {
        console.log("IndexedDB error: " + (event.target as any).errorCode);
    };  

    // If success
    IDBrequest.onsuccess = function(event) {
        const db = IDBrequest.result;
        const transaction = db.transaction([DBstore], "readwrite");
        const objectStore = transaction.objectStore(DBstore);
        const request = objectStore.getAll();
        request.onsuccess = function(event) {
            console.log("Data has been added to your database.");
        };
        transaction.oncomplete = function(event) {
            db.close();
        };
    };
}


function saveDataToClientDevice(data: any, filename: string) {
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('download', filename);
    a.setAttribute('href', url);
    a.click();
}

function saveJSONDataToClientDevice(data: any, filename: string) {
    saveDataToClientDevice(JSON.stringify(data), filename);
}

function convertJSONToCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }

    // ดึงหัวข้อจาก key ของ object ตัวแรก
    const headers = Object.keys(data[0]);

    // สร้างแถวของหัวข้อและข้อมูล
    const rows = data.map((row) =>
        headers.map((header) => `"${(row[header] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    );

    // รวม headers และ rows เป็น CSV
    return [headers.join(','), ...rows].join('\n');
}

function saveCSVDataToClientDevice(data: any[], filename: string) {
    // ตรวจสอบและเพิ่มนามสกุล .csv หากไม่มี
    if (!filename.endsWith('.csv')) {
        filename += '.csv';
    }

    // แปลง JSON เป็น CSV
    const csvContent = convertJSONToCSV(data);

    // สร้าง Blob และดาวน์โหลดไฟล์
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('download', filename);
    a.setAttribute('href', url);
    a.click();
}


export {
    saveCSVDataToClientDevice,
    convertJSONToCSV,
    saveDataToLocalStorage,
    saveDataToIndexedDB,
    saveDataToClientDevice,
    saveJSONDataToClientDevice,
    getDataFromLocalStorage,
    getDataFromIndexedDB
}