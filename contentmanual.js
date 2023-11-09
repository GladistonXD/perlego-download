(function() {
    let stopSearch = false;

function enviarProgresso(progress){
	chrome.runtime.sendMessage({ type: 'progressUpdate', progress: progress });
}

async function procurarElemento(pagina) {
    const elemento = document.evaluate(`//*[@id="p${pagina}--0"]/div/div[2]/object`,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;
    const elementox = document.evaluate(`//*[@id="p${pagina}--0"]`,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;

    if (elemento) {
        return elementox.innerHTML + '<br>' + '\n';
    }
    return null;
}

async function downloadResultados(resultados, nomeArquivo) {
    const blob = new Blob([resultados], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
    clearIndexedDB();
}


async function startSearchingAndSaving() {
    try {
        const result = document.evaluate("/html/body/div[1]/main/div[1]/div[2]/div[3]/div/text()[3]",document,null,XPathResult.ANY_TYPE,null);
        const result2 = document.evaluate("/html/body/div[1]/main/div[1]/div[2]/div[4]/div/text()[3]",document,null,XPathResult.ANY_TYPE,null);
        let text = '';
        let node = result.iterateNext();
        if (!node) {
            node = result2.iterateNext();
        }
        while (node) {
            text += node.textContent;
            node = result.iterateNext();
        }
        const pagefinal = Number(text);

        let stopButton = document.createElement('button');
        stopButton.textContent = 'Quit and save';
        stopButton.style.position = 'fixed';
        stopButton.style.top = '54%';
        stopButton.style.right = '47%';
        stopButton.style.zIndex = '9999';
        stopButton.style.backgroundColor = 'white';
        stopButton.style.color = 'green';
        stopButton.style.fontWeight = 'bold';
        document.body.appendChild(stopButton);
        let timeoutID;

        let resultadosArray = [];

        stopButton.addEventListener('click', async () => {
			stopSearch = true;
            stopButton.remove();
            const messages = document.querySelectorAll('div#mensagem');
            messages.forEach(message => {
                message.remove();
            });
            window.clearTimeout(timeoutID);
            console.log("Busca encerrada pelo usuário.");
            const db = await openIndexedDB();
            await putTodoConteudo(db, resultadosArray);
            await downloadResultados(resultadosArray, 'perlego.html');

        });

        async function rolarAteEncontrarPagina(pagina) {
            const db = await openIndexedDB();
            const lastProcessedIndex = await getLastProcessedIndex(db) || 0;
            const storedResult = await getTodoConteudo(db);

            resultadosArray = storedResult ? storedResult : [];

            if (pagina <= pagefinal && !stopSearch) {
                if (pagina > lastProcessedIndex) {
                    const conteudoElemento = await procurarElemento(pagina);

                    let mensagem = document.getElementById('mensagem');

                    if (conteudoElemento === null && !stopSearch) {
                        if (!mensagem) {
                        mensagem = document.createElement('div');
                        mensagem.style.position = 'fixed';
                        mensagem.style.top = '50%';
                        mensagem.style.left = '50%';
                        mensagem.style.transform = 'translate(-50%, -50%)';
                        mensagem.style.padding = '20px';
                        mensagem.style.background = '#ffffff';
                        mensagem.style.border = '1px solid #ccc';
                        mensagem.style.zIndex = '9999';
                        mensagem.style.fontWeight = 'bold';
                        mensagem.id = 'mensagem';
                        document.body.appendChild(mensagem);
                        }
                        mensagem.textContent = `Page ${pagina-1}/${pagefinal} found. Keep scrolling to the page ${pagefinal}`;
                        rolarAteEncontrarPagina(pagina);
                    } else if (!stopSearch) {
                        let mensagemElement = document.getElementById('mensagem');
                        if (mensagemElement) {
                            mensagemElement.textContent = `Page ${pagina}/${pagefinal} found. Keep scrolling to the page ${pagefinal}`;
                        }
                        console.log(`Conteúdo do elemento da página ${pagina} encontrado:`);
                        const progressoAtual = Math.floor((pagina / pagefinal) * 100);
                        enviarProgresso(progressoAtual);
                        resultadosArray.push(conteudoElemento);

                        await putLastProcessedIndex(db, pagina);
                        await putTodoConteudo(db, resultadosArray);
                        rolarAteEncontrarPagina(pagina + 1);
                        if (pagina === pagefinal) {
                            stopButton.click();
                            stopSearch = true;
                            return; 
                        }
                    }                    
                } else {
                    rolarAteEncontrarPagina(pagina + 1);
                }
            }
        }
        await rolarAteEncontrarPagina(1);
    } catch (error) {
        if (error) {
            console.log(error)
            throw new Error();
        }
    }
}

async function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const dbOpenRequest = window.indexedDB.open('MeuBancoDeDados', 1);

        dbOpenRequest.onupgradeneeded = function (event) {
            const db = event.target.result;
            db.createObjectStore('conteudo', { autoIncrement: true });
        };

        dbOpenRequest.onsuccess = function (event) {
            resolve(event.target.result);
        };

        dbOpenRequest.onerror = function (event) {
            reject(event.error);
        };
    });
}

async function clearIndexedDB() {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['conteudo'], 'readwrite');
        const store = transaction.objectStore('conteudo');
        store.clear();
        console.log('Dados anteriores foram apagados com sucesso.');
    } catch (error) {
        console.error('Erro ao apagar os dados anteriores:', error);
    }
}

async function getLastProcessedIndex(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readonly');
        const store = transaction.objectStore('conteudo');
        const lastIndexRequest = store.get('lastProcessedIndex');

        lastIndexRequest.onsuccess = function (event) {
            resolve(event.target.result || 0);
        };

        lastIndexRequest.onerror = function (event) {
            reject(event.error);
        };
    });
}

async function putLastProcessedIndex(db, index) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readwrite');
        const store = transaction.objectStore('conteudo');
        const putRequest = store.put(index, 'lastProcessedIndex');

        putRequest.onsuccess = function (event) {
            resolve();
        };

        putRequest.onerror = function (event) {
            reject(event.error);
        };
    });
}

async function getTodoConteudo(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readonly');
        const store = transaction.objectStore('conteudo');
        const request = store.get('todoConteudo');

        request.onsuccess = function (event) {
            resolve(event.target.result);
        };

        request.onerror = function (event) {
            reject(event.error);
        };
    });
}

async function putTodoConteudo(db, content) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readwrite');
        const store = transaction.objectStore('conteudo');
        const request = store.put(content, 'todoConteudo');
        request.onsuccess = function (event) {
            resolve();
        };
        request.onerror = function (event) {
            reject(event.error);
        };
    });
}

startSearchingAndSaving();
})();
