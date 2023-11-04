try {
	const result = document.evaluate("/html/body/div[1]/main/div[1]/div[2]/div[3]/div/text()[3]", document, null, XPathResult.ANY_TYPE, null);
	let text = '';
	let node = result.iterateNext();
	while (node) {
		text += node.textContent;
		node = result.iterateNext();
	}
	const pagefinal = text;
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
	let resultadosHTML = '<html><head><title>Resultados da Busca</title></head><body>'+'\n';

	stopButton.addEventListener('click', () => {
		stopButton.remove(); 
		window.clearTimeout(timeoutID);
		console.log("Busca encerrada pelo usuário.");
		resultadosHTML += '</body></html>'; 
		downloadResultados(resultadosHTML, 'perlego.html');

		let mensagem = document.getElementById('mensagem');
		if (mensagem) {
			mensagem.remove();
		}
	});

	function procurarElemento(pagina) {
		const elemento = document.evaluate(`//*[@id="p${pagina}--0"]/div/div[2]/object`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
		const elementox = document.evaluate(`//*[@id="p${pagina}--0"]/div/div[2]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
		if (elemento) {
			return elementox.innerHTML+'\n';
		}
		return null;
	}
	function rolarAteEncontrarPagina(pagina) {
		if (pagina <= pagefinal) {
			const conteudoElemento = procurarElemento(pagina);
			if (conteudoElemento === null) {
				const mensagem = document.createElement('div');
				mensagem.textContent = `Page ${pagina-1}/${pagefinal} found. Keep scrolling to the page ${pagefinal}`;
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
				timeoutID = setTimeout(() => {
					mensagem.remove();
					rolarAteEncontrarPagina(pagina);
				}, 500);
			} else {
				console.log(`Conteúdo do elemento da página ${pagina} encontrado:`);
				resultadosHTML += conteudoElemento;
				if (pagina < pagefinal) {
					rolarAteEncontrarPagina(pagina + 1);
				} else {
					console.log('Processo encerrado na página 100.');
					stopButton.click(); 
				}
			}
		}
	}
	rolarAteEncontrarPagina(1);
	function downloadResultados(resultados, nomeArquivo) {
		const blob = new Blob([resultados], { type: 'text/html' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = nomeArquivo;
		link.click();
	}
} catch(error){
    if (error) {
        throw new Error();
    }
}
