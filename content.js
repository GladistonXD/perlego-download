function enviarProgresso(progress){
	chrome.runtime.sendMessage({ type: 'progressUpdate', progress: progress });
}
	
function clicarEcapturarConteudoBruto(indice, pagefinal) {
	const time = 1000
	return new Promise((resolve, reject) => {
		var elementoIndex = document.querySelector('[data-test-locator="Epub-ChapterRow-Index-'+indice+'"] [tabindex="0"]');
		if (elementoIndex) {
			elementoIndex.click();
			setTimeout(() => {
				var scrollToBottom = () => {
					return new Promise((resolveScroll, rejectScroll) => {
						var scroll = () => {
							window.scrollBy(0, window.innerHeight);
							if (window.innerHeight + window.scrollY >= document.body.scrollHeight) {
								setTimeout(() => {
									resolveScroll(); 
								}, time);
							} else {
								scroll();
							}
						};
						scroll();
					});
				};
				scrollToBottom().then(() => {
				var xpath = '//*[@id="p'+indice+'--0"]';
				function verificarElemento() {
					var elementoCapturado = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
					if (elementoCapturado) {
						resolve(elementoCapturado.outerHTML);
						} else {
							setTimeout(verificarElemento, 1000);
						}
					}
					verificarElemento(); 
				}).catch((error) => {
					reject(error);
				});
			}, 2000);
		
		} else {
			try	{
				const elemento = document.evaluate("//div[@data-test-locator='Pdf-SubChapterRow-Page-"+indice+"']/div", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
				if (elemento) {
					elemento.click();
					setTimeout(() => {
						var scrollToBottom = () => {
							return new Promise((resolveScroll, rejectScroll) => {
								var scroll = () => {
									window.scrollBy(0, window.innerHeight);
									if (window.innerHeight + window.scrollY >= document.body.scrollHeight) {
										setTimeout(() => {
											resolveScroll(); 
										}, time);
									} else {
										scroll();
									}
								};
								scroll();
							});
						};
						scrollToBottom().then(() => {
							var xpath = '//*[@id="p'+indice+'--0"]';
							function verificarElemento() {
								var elementoCapturado = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
								if (elementoCapturado) {
									resolve(elementoCapturado.outerHTML);
								} else {
									setTimeout(verificarElemento, 1000);
								}
							}
						verificarElemento(); 
						}).catch((error) => {
							reject(error);
						});		
					}, 2000); 					
				} else {
					try	{
						const num = indice+1
						console.log(num)
						const elemento = document.evaluate("//div[@data-test-locator='Epub-ChapterRow-Page-"+num+"']/div", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
						if (elemento) {								
							let stopButton = document.createElement('button');
							stopButton.textContent = 'Arquivo em PDF, usar modo manual para baixar';
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



async function criarArquivoDownloadComConteudo() {
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
					console.log("Conteúdo do Table of Contents foi aberto com sucesso.");
				} else {
					console.log("Falha ao abrir o conteúdo do Table of Contents.");
				}
			}, 2000);
		}
	}

	var todoConteudoBruto = '';
	const elementos = document.querySelectorAll('[data-test-locator^="Epub-ChapterRow-"]');

	if (elementos.length > 0) {
		const ultimoElemento = elementos[elementos.length - 1];
		const ultimoIndice = ultimoElemento.getAttribute('data-test-locator').match(/\d+$/)[0];
		console.log("Ultima pagina é: " + ultimoIndice);

		for (var i = 0; i <= ultimoIndice; i++) {
			try {
				const conteudoBruto = await clicarEcapturarConteudoBruto(i, ultimoIndice);
				todoConteudoBruto += conteudoBruto;
				const progressoAtual = Math.floor((i / ultimoIndice) * 100);
				enviarProgresso(progressoAtual);
			} catch (error) {
				console.error(error);
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
		var blob = new Blob(['<head><meta charset="UTF-8"></head><div id="content" class="content highlighter-context" col-centered="true" style="color: rgb(249, 248, 246); max-width: 792.952px;">'+modificado.replace(/Georgia; object-fit: contain; width: 100%; height: 100%;/g,'Georgia; object-fit: contain; width: 100%;')], { type: 'text/html' });

		var link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'perlego.html';

		link.click();
	}
}
criarArquivoDownloadComConteudo();
