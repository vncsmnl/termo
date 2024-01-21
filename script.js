var height = 6; // número de tentativas
var width = 5; // tamanho das palavras

var row = 0; // tentativa atual
var col = 0; // letra atual

var gameOver = false;

var wordList; // Lista de palavras a ser obtida do Gist
var word = ""; // Palavra atual a ser adivinhada

// URL raw do Gist com a lista de palavras
var GIST_URL = 'https://gist.githubusercontent.com/vncsmnl/25e7c165da276405af8ca4e1c8e17806/raw/bd238615c9089721a16418289589961490d0cf65/wordlist';

window.onload = function () {
    carregarListaPalavras(GIST_URL)
        .then(lista => {
            wordList = lista;
            iniciarJogo();
        })
        .catch(erro => {
            console.error('Erro ao carregar a lista de palavras:', erro);
        });
}

function carregarListaPalavras(gistURL) {
    return fetch(gistURL)
        .then(response => response.text())
        .then(text => text.split('\n').filter(palavra => palavra.trim() !== ''));
}

function iniciarJogo() {
    word = wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();
    console.log(word);
    intialize();
}


function intialize() {

    // Criação do tabuleiro
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            // <span id="0-0" class="tile">P</span> o JS vai criar tipo isso
            let tile = document.createElement("span");
            tile.id = r.toString() + "-" + c.toString();
            tile.classList.add("tile");
            tile.innerText = "";
            document.getElementById("board").appendChild(tile);
        }
    }

    // Criando o teclado
    let keyboard = [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç"],
        ["Enter", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
    ];


    for (let i = 0; i < keyboard.length; i++) {
        let currRow = keyboard[i];
        let keyboardRow = document.createElement("div");
        keyboardRow.classList.add("keyboard-row");

        for (let j = 0; j < currRow.length; j++) {
            let keyTile = document.createElement("div");

            let key = currRow[j];
            keyTile.innerText = key;
            if (key == "Enter") {
                keyTile.id = "Enter";
            }
            else if (key == "⌫") {
                keyTile.id = "Backspace";
            }
            else if ("A" <= key && key <= "Z") {
                keyTile.id = "Key" + key; // "Key" + "A";
            }

            keyTile.addEventListener("click", processKey);

            if (key == "Enter") {
                keyTile.classList.add("enter-key-tile");
            } else {
                keyTile.classList.add("key-tile");
            }
            keyboardRow.appendChild(keyTile);
        }
        document.body.appendChild(keyboardRow);
    }


    // JS pegando o input do teclado
    document.addEventListener("keyup", (e) => {
        processInput(e);
    })
}

function processKey() {
    e = { "code": this.id };
    processInput(e);
}

function removerAcentos(palavra) {
    return palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function validarPalavra(palavra) {
    const palavraSemAcentos = removerAcentos(palavra);
    const palavraUpperCase = palavraSemAcentos.toUpperCase();
    return wordList.some(item => {
        const itemSemAcentos = removerAcentos(item);
        return itemSemAcentos.toUpperCase() === palavraUpperCase;
    });
}

function processInput(e) {
    if (gameOver) return;

    // alert(e.code);
    if (("KeyA" <= e.code && e.code <= "KeyZ") || e.code == "KeyÇ") {
        if (col < width) {
            let currTile = document.getElementById(row.toString() + '-' + col.toString());
            if (currTile.innerText == "") {
                currTile.innerText = e.code == "KeyÇ" ? "Ç" : e.code[3];
                col += 1;
            }
        }
    }


    else if (e.code == "Backspace") {
        if (0 < col && col <= width) {
            col -= 1;
        }
        let currTile = document.getElementById(row.toString() + '-' + col.toString());
        currTile.innerText = "";
    }

    else if (e.code == "KeyÇ") {
        if (col < width) {
            let currTile = document.getElementById(row.toString() + '-' + col.toString());
            if (currTile.innerText == "") {
                currTile.innerText = "Ç";
                col += 1;
            }
        }
    }

    else if (e.code == "Enter") {
        // Obtém a palavra construída
        let guess = "";
        for (let c = 0; c < width; c++) {
            let currTile = document.getElementById(row.toString() + '-' + c.toString());
            let letter = currTile.innerText;
            guess += letter;
        }

        // Valida a palavra
        if (validarPalavra(guess)) {
            update();
        } else {
            // TODO: Adicionar aqui uma lógica mais interessante para lidar com essa validação!
            alert('Palavra inválida!');
        }
    }

    if (!gameOver && row == height) {
        gameOver = true;
        document.getElementById("answer").innerText = word;
        setTimeout(function () {
            window.location.reload(false);
        }, 2000);
    }
}

function update() {
    let guess = "";
    document.getElementById("answer").innerText = "";

    //suposições de palavra
    for (let c = 0; c < width; c++) {
        let currTile = document.getElementById(row.toString() + '-' + c.toString());
        let letter = currTile.innerText;
        guess += letter;
    }

    guess = guess.toLowerCase(); //case sensitive
    console.log(guess);

    //Começa o processo de adivinhação
    let correct = 0;

    let letterCount = {}; //Acompanhe a frequência das letras, ex) KENNY -> {K:1, E:1, N:2, Y: 1}
    for (let i = 0; i < word.length; i++) {
        let letter = word[i];

        if (letterCount[letter]) {
            letterCount[letter] += 1;
        }
        else {
            letterCount[letter] = 1;
        }
    }

    console.log(letterCount);

    //primeira interação, verifique todas as corretas primeiro
    for (let c = 0; c < width; c++) {
        let currTile = document.getElementById(row.toString() + '-' + c.toString());
        let letter = currTile.innerText;

        //posição correta
        if (word[c] == letter) {
            currTile.classList.add("correct");

            let keyTile = document.getElementById("Key" + letter);
            keyTile.classList.remove("present");
            keyTile.classList.add("correct");

            correct += 1;
            letterCount[letter] -= 1; //deduzir a contagem de letras
        }

        if (correct == width) {
            gameOver = true;
            setTimeout(function () {
                window.location.reload(false);
            }, 2000);
        }
    }

    console.log(letterCount);
    //vá novamente e marque quais estão presentes, mas na posição errada
    for (let c = 0; c < width; c++) {
        let currTile = document.getElementById(row.toString() + '-' + c.toString());
        let letter = currTile.innerText;

        // pule a letra se estiver marcada como correta
        if (!currTile.classList.contains("correct")) {
            //Está na palavra? certifique-se de que não contamos duas vezes
            if (word.includes(letter) && letterCount[letter] > 0) {
                currTile.classList.add("present");

                let keyTile = document.getElementById("Key" + letter);
                if (!keyTile.classList.contains("correct")) {
                    keyTile.classList.add("present");
                }
                letterCount[letter] -= 1;
            } // Não é a palavra ou (todas as letras foram usadas para evitar excesso de contagem)
            else {
                currTile.classList.add("absent");
                let keyTile = document.getElementById("Key" + letter);
                keyTile.classList.add("absent")
            }
        }
    }

    row += 1; //nova linha
    col = 0; //começa uma nova linha no inicio
}