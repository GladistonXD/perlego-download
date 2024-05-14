function enviarProgresso(progress){
    chrome.runtime.sendMessage({ type: 'progressUpdate', progress: progress });
}

function clicarEcapturarConteudoBruto(indice, pagefinal) {
    const time = 2000
    return new Promise((resolve, reject) => {
        var elementoIndex = document.querySelector('[data-test-locator="Epub-ChapterRow-Index-'+indice+'"] [tabindex="0"]');
        if (elementoIndex) {
            elementoIndex.click();
            setTimeout(() => {
                function verificarElemento() {
                    var elementoCapturado = document.evaluate("//div[@class='chapter-loaded highlighter-context' and @id='p"+indice+"--0']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (elementoCapturado) {
                        resolve(elementoCapturado.outerHTML+'<br>\n\n');
                        } else {
                            setTimeout(verificarElemento, 1000);
                        }
                    }
                    verificarElemento(); 
            }, time);
        
        } else {
            try {
                const elemento = document.evaluate("//div[@data-test-locator='Pdf-SubChapterRow-Page-"+indice+"']/div", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                const elementosub = document.evaluate("//div[@data-test-locator='Pdf-SubSubChapterRow-Page-"+indice+"']/div", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (elemento || elementosub) {
                    if (elemento) {
                        elemento.click();
                    } else {
                        elementosub.click();
                    }
                    setTimeout(() => {
                            function verificarElemento() {
                                var elementoCapturado = document.evaluate("//div[@class='chapter-loaded highlighter-context' and @id='p"+indice+"--0']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                if (elementoCapturado) {
                                    resolve(elementoCapturado.outerHTML+'<br>\n\n');
                                } else {
                                    setTimeout(verificarElemento, 1000);
                                }
                            }
                        verificarElemento(); 
                    }, time);                     
                } else {
                    var elementoCapturado = document.evaluate("//div[@class='chapter-loaded highlighter-context' and @id='p"+indice+"--0']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (elementoCapturado) {
                        resolve(elementoCapturado.outerHTML+'<br>\n\n');
                    }
                    try {
                        const num = indice+1
                        const elemento = document.evaluate("//div[@data-test-locator='Epub-ChapterRow-Page-"+num+"']/div", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (elemento) {                                
                            let stopButton = document.createElement('button');
                            stopButton.textContent = 'PDF file, use manual mode to download';
                            stopButton.style.position = 'fixed';
                            stopButton.style.top = '54%';
                            stopButton.style.right = '46%';
                            stopButton.style.zIndex = '9999';
                            stopButton.style.backgroundColor = 'white'; 
                            stopButton.style.color = 'green'; 
                            stopButton.style.fontWeight = 'bold';
                            document.body.appendChild(stopButton);
                        } else{
                            reject('Elemento não encontrado ' + indice);
                        }
                    } catch(error){
                        reject(error);
                    }
                }
            
            } catch(error){
                reject('Elemento não encontrado ' + indice);
            }
        }
    });
}

async function abrirbotao(){
    const botaoTOC = document.querySelector('button[data-test-locator="Icon-TOC"]');
    if (!botaoTOC) {
        console.log("Botão do Table of Contents não encontrado");
    } else {
        let conteudoTOC = document.querySelector('[data-test-locator="ToolbarPanel"]');

        if (!conteudoTOC) {
            console.log("Conteúdo do Table of Contents não encontrado. Abrindo agora...");
        
            botaoTOC.click();
        
            setTimeout(() => {
                conteudoTOC = document.querySelector('[data-test-locator="ToolbarPanel"]');
                if (conteudoTOC) {
                    criarArquivoDownloadComConteudo();
                    console.log("Conteúdo do Table of Contents foi aberto com sucesso.");
                } else {
                    console.log("Falha ao abrir o conteúdo do Table of Contents.");
                }
            }, 2000);
        } else {
            criarArquivoDownloadComConteudo();
        }
    }
}


async function criarArquivoDownloadComConteudo() {
    let todoConteudoBruto = '';
    const elementos = document.querySelectorAll('[data-test-locator^="Epub-ChapterRow-"]');
    const db = await openIndexedDB(); 

    if (elementos.length > 0) {
        let lastProcessedIndex = await getLastProcessedIndex(db) || 0;
        console.log(lastProcessedIndex)
        let todoConteudoBruto = await getTodoConteudo(db) || ''; 
        //const ultimoElemento = elementos[elementos.length - 1];
        //const ultimoIndicecont = ultimoElemento.getAttribute('data-test-locator').match(/\d+$/)[0];
        //const result = document.evaluate("/html/body/div[1]/main/div[1]/div[2]/div[3]/div/text()[3]",document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;
        //const result2 = document.evaluate("/html/body/div[1]/main/div[1]/div[2]/div[4]/div/text()[3]",document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;
        //let text = '';

        //let node = result || result2;
        //text = node.textContent.trim();
        var divs = document.querySelectorAll('div[data-test-locator]');
        var maiorNumero = -1;
        divs.forEach(function(elemento) {
            var valor = elemento.getAttribute('data-test-locator');
            var match = valor.match(/\d+/);
            if (match !== null) {
                var numero = parseInt(match[0]);
                if (numero > maiorNumero) {
                    maiorNumero = numero;
                }
            }
        });
        const pagefinal = maiorNumero;
	ultimoIndice = pagefinal
        console.log("Última página é: " + ultimoIndice);
        for (let i = lastProcessedIndex; i <= ultimoIndice; i++) {
            try {
                const conteudoBruto = await clicarEcapturarConteudoBruto(i, ultimoIndice);
                todoConteudoBruto += conteudoBruto; 
                const progressoAtual = Math.floor((i / ultimoIndice) * 100);
                enviarProgresso(progressoAtual);
                lastProcessedIndex = i;
                await putLastProcessedIndex(db, lastProcessedIndex+1);
                await putTodoConteudo(db, todoConteudoBruto);
            } catch (error) {
                console.log(error);
            }
        }
        let img_tags = todoConteudoBruto.split('</picture>');

        let modified_html = '';

        for (let index = 0; index < img_tags.length; index++) {
            let img = img_tags[index];

            if (img.includes('source data-srcset=')) {
                let srcset_start = img.indexOf('source data-srcset=') + 'source data-srcset="'.length;
                let srcset_end = img.indexOf('"', srcset_start);
                let srcset_value = img.substring(srcset_start, srcset_end);
                img = img.replace(srcset_value, '') + srcset_value + '"</picture>';
            }
            modified_html += img;

            if (index !== img_tags.length - 1) {
                modified_html += '</picture>';
            }
        }

        let modificado = modified_html.replace(/">https/g, '" src="https').replace(/opacity: 0/g, 'opacity: 1').replace(/<.picture><.picture>/g, '</picture>');
        var blob = new Blob([`<!DOCTYPE html><head><script>function scrollWithinBook(identifier, pageNumber) {var element;if (identifier === '') {element = document.getElementById('p' + pageNumber + '--0');} else {element = document.querySelector('[data-originalid="' + identifier + '"]');}if (element) {var yOffset = element.getBoundingClientRect().top + window.pageYOffset;window.scrollTo({ top: yOffset, behavior: 'smooth' });} else {}}function LoadChapter(identifier) {}function showImage(identifier) {}function scrollToDataOriginalId() {var hash = window.location.hash;if (hash) {var dataOriginalId = hash.substr(1);var element = document.querySelector('[data-originalid="' + dataOriginalId + '"]');if (element) {var yOffset = element.getBoundingClientRect().top + window.pageYOffset;window.scrollTo({ top: yOffset, behavior: 'smooth' });} else {}}}window.onload = function() {scrollToDataOriginalId();};</script><meta charset="UTF-8"></head><div id="content" class="content highlighter-context" col-centered="true" style="max-width: 792.952px;">`+modificado.replace(/Georgia; object-fit: contain; width: 100%; height: 100%;/g,'Georgia; object-fit: contain; width: 100%;')], { type: 'text/html' });

        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'perlego.html';

        link.click();
        resetarEIniciarCaptura()
    }
}

async function getTodoConteudo(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readonly');
        const store = transaction.objectStore('conteudo');
        const request = store.get('todoConteudo');

        request.onsuccess = function(event) {
            resolve(event.target.result);
        };

        request.onerror = function(event) {
            reject(event.error);
        };
    });
}

async function putTodoConteudo(db, content) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readwrite');
        const store = transaction.objectStore('conteudo');
        const request = store.put(content, 'todoConteudo');

        request.onsuccess = function(event) {
            resolve();
        };

        request.onerror = function(event) {
            reject(event.error);
        };
    });
}

async function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const dbOpenRequest = window.indexedDB.open('MeuBancoDeDados', 1);

        dbOpenRequest.onupgradeneeded = function(event) {
            const db = event.target.result;
            db.createObjectStore('conteudo', { autoIncrement: true });
        };

        dbOpenRequest.onsuccess = function(event) {
            resolve(event.target.result);
        };

        dbOpenRequest.onerror = function(event) {
            reject(event.error);
        };
    });
}

async function getLastProcessedIndex(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readonly');
        const store = transaction.objectStore('conteudo');
        const lastIndexRequest = store.get('lastProcessedIndex');

        lastIndexRequest.onsuccess = function(event) {
            resolve(event.target.result || 0);
        };

        lastIndexRequest.onerror = function(event) {
            reject(event.error);
        };
    });
}

async function putLastProcessedIndex(db, index) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['conteudo'], 'readwrite');
        const store = transaction.objectStore('conteudo');
        const putRequest = store.put(index, 'lastProcessedIndex');

        putRequest.onsuccess = function(event) {
            resolve();
        };

        putRequest.onerror = function(event) {
            reject(event.error);
        };
    });
}

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
    const db = await openIndexedDB(); 
    await resetAllContent(db);
    await resetLastProcessedIndex(db);
}

abrirbotao()
