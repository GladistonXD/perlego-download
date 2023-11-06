chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'executeResetarEIniciarCaptura') {
    resetarEIniciarCaptura();
	console.log('ok')
  }
});

async function resetLastProcessedIndex(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readwrite');
        const store = transaction.objectStore('conteudo');

        const deleteRequest = store.delete('lastProcessedIndex');

        deleteRequest.onsuccess = function (event) {
            resolve();
        };

        deleteRequest.onerror = function (event) {
            reject(event.error);
        };
    });
}

async function resetAllContent(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readwrite');
        const store = transaction.objectStore('conteudo');
        const request = store.clear();

        request.onsuccess = function(event) {
            resolve();
        };

        request.onerror = function(event) {
            reject(event.error);
        };
    });
}

async function resetarEIniciarCaptura() {
    const db = await openIndexedDB(); // Abre o IndexedDB
    await resetAllContent(db); // Limpa todo o conteúdo armazenado
    await resetLastProcessedIndex(db); // Reseta o lastProcessedIndex para começar do início
	alert('Continuity clean successfully!');
}

resetarEIniciarCaptura();