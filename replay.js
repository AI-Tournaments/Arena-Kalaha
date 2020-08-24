'use strict'
function a(){
	let data = JSON.parse(decodeURI(location.hash.substring(1)));
	console.log(data);
	let baseUp = data.settings.gameboard.boardLength;
	let baseDown = baseUp*2;

	window.onresize = resizeGameboard;
	init();

	function resizeGameboard(){
		let gameboard = document.getElementById('gamebord');
		let allSquares = [...document.getElementsByClassName('square')];
		gameboard.style.zoom = 1;
		let maxWidth = allSquares[0].clientHeight;
		// Get max
		for(let square of allSquares){
			square.style.width = '';
			maxWidth = Math.max(maxWidth, square.clientWidth);
		}
		// Set max
		for(let square of allSquares){
			square.style.width = maxWidth + 'px';
		}
		let zoom = gameboard.parentElement.offsetWidth / gameboard.offsetWidth;
		gameboard.style.zoom = zoom;
	}

	function init(){
		// Rezero base columns.
		document.getElementById('column-up').innerHTML = '<div id="square_' + baseUp + '" class="square square-up">0</div>';
		document.getElementById('column-down').innerHTML = '<div id="square_' + baseDown + '" class="square">0</div>';

		// Recreate up and down rows.
		let rowUp = document.getElementById('rowUp');
		let rowDown = document.getElementById('rowDown');
		rowUp.innerHTML = '';
		rowDown.innerHTML = '';
		for(let index = 0; index < data.settings.boardLength; index++){
			rowUp.innerHTML += '<div id="square_' + (boardSize*2 + 1 - index) + '" class="square square-up">' + startValue + '</div>';
			rowDown.innerHTML += '<div id="square_' + (index + 1) + '" class="square">' + startValue + '</div>';
		}

		// Customize squares
		//let baseUpSquare = document.getElementById('square_' + baseUp);
		//let baseDownSquare = document.getElementById('square_' + baseDown);
		//baseUpSquare.style.backgroundColor = colorBaseUp; // TODO: Set team color.
		//baseDownSquare.style.backgroundColor = colorBaseDown; // TODO: Set team color.

		resizeGameboard();
	}
}
