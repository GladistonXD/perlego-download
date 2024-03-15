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
    const blob = new Blob(resultados, { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
    clearIndexedDB();
}

async function getAllContent(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readonly');
        const store = transaction.objectStore('conteudo');
        const allContentRequest = store.getAll();

        allContentRequest.onsuccess = function (event) {
            resolve(event.target.result);
        };

        allContentRequest.onerror = function (event) {
            reject(event.error);
        };
    });
}

async function getAllKeys(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readonly');
        const store = transaction.objectStore('conteudo');
        const getAllKeysRequest = store.getAllKeys();

        getAllKeysRequest.onsuccess = function (event) {
            resolve(event.target.result);
        };

        getAllKeysRequest.onerror = function (event) {
            reject(event.error);
        };
    });
}
async function exibirMensagemInicial(pagefinal) {
    const mensagemElement = document.createElement('div');
    mensagemElement.style.position = 'fixed';
    mensagemElement.style.top = '50%';
    mensagemElement.style.left = '50%';
    mensagemElement.style.transform = 'translate(-50%, -50%)';
    mensagemElement.style.padding = '20px';
    mensagemElement.style.background = '#ffffff';
    mensagemElement.style.border = '1px solid #ccc';
    mensagemElement.style.zIndex = '9999';
    mensagemElement.style.fontWeight = 'bold';
    mensagemElement.id = 'mensagem';
    document.body.appendChild(mensagemElement);
    const db = await openIndexedDB();
    const ultimaPagina = await getLastProcessedIndex(db);
    mensagemElement.textContent = `Page ${ultimaPagina}/${pagefinal} found. Keep scrolling to the page ${pagefinal}`;
    return mensagemElement;
}

async function startSearchingAndSaving() {
    try {
        var elemento = document.querySelector('div[data-test-locator="pagination-total-chapter-numbers"]');
        var pagefinal = null;
        if (elemento !== null) {
            var conteudo = elemento.textContent.trim();
            var numeros = conteudo.match(/\d+/g);
            if (numeros !== null && numeros.length > 0) {
                var numero = parseInt(numeros[0]);
                pagefinal = Number(numero);
            }
        }
		const mensagemInicial = await exibirMensagemInicial(pagefinal);

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

            const allKeys = await getAllKeys(db);
            let combinedContent = [];

            for (const key of allKeys) {
                const content = await getTodoConteudoByKey(db, key);
                if (Array.isArray(content)) {
                    combinedContent = combinedContent.concat(content);
                }
            }

            await downloadResultados(combinedContent, 'perlego.html');
        });

        async function getTodoConteudoByKey(db, key) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['conteudo'], 'readonly');
                const store = transaction.objectStore('conteudo');
                const request = store.get(key);

                request.onsuccess = function (event) {
                    resolve(event.target.result);
                };

                request.onerror = function (event) {
                    reject(event.error);
                };
            });
        }

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
                        try {
                            resultadosArray.push(conteudoElemento);
                            await putLastProcessedIndex(db, pagina);
                            const chunkSize = 50;
                            let index = 0;
                            while (index < resultadosArray.length) {
                                const chunk = resultadosArray.slice(index, index + chunkSize);
                                index += chunkSize;
                                const paddedPage = `p${pagina}`.padStart(Math.max(4, `${pagina}`.length + 1), '0');
                                await putTodoConteudo(db, paddedPage, chunk);
                            }
                            rolarAteEncontrarPagina(pagina + 1);
                        } catch(error) {
                            console.log(error)
                        }
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

async function putTodoConteudo(db, key, content) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readwrite');
        const store = transaction.objectStore('conteudo');
        const getRequest = store.get(key);

        getRequest.onsuccess = function (event) {
            const existingData = event.target.result || [];
            const newData = existingData.concat(content);
            store.put(newData, key);
            resolve();
        };

        getRequest.onerror = function (event) {
            reject(event.error);
        };
    });
}

startSearchingAndSaving();
})();
