'use strict'
function a(){
	let selectMatches = document.getElementById('matches');
	let buttonBack = document.getElementById('step-back');
	let buttonNext = document.getElementById('step-next');
	let scoreBoard = document.getElementById('score-board');
	let _currentMatchIndex;
	ReplayHelper.init(replay=>{
		selectMatches.onchange = ()=>{
			_currentMatchIndex = parseInt(selectMatches.selectedOptions[0].dataset.index);
			let matchLog = replay.arenaResult.matchLogs[_currentMatchIndex];
			if(matchLog.error){
				document.body.style.color = 'red';
				document.body.style.fontFamily = 'monospace';
				document.body.style.whiteSpace = 'pre';
				document.body.innerText = matchLog.error;
				return;
			}
			let scoreBoardString = '<div style="text-align: center; font-style: italic;">'+(replay.arenaResult.result.partialResult?'Partial result':'Result')+'</div><table><tr><th>Team</th><th>Participant</th>';
			let dataRows = [];
			replay.arenaResult.matchLogs.forEach((matchLog, index) => {
				if(matchLog.scores){
					scoreBoardString += '<th>'+(1<replay.arenaResult.matchLogs.length ? 'Match '+(index+1) : 'Score')+'</th>';
					matchLog.scores.forEach(score => {
						if(!dataRows[score.team]){
							dataRows[score.team] = ['<tr style="color:'+replay.arenaResult.teams[score.team].color.RGB+';"><td>'+score.team+'</td><td>'+score.members[0].name+'</td>', score.score];
						}
						dataRows[score.team][0] += '<td>'+score.score+'</td>';
					});
				}
			});
			if(1 < replay.arenaResult.matchLogs.length){
				scoreBoardString += '<th>Total</th><th>Average</th>';
				replay.arenaResult.result.team.forEach((r,i) => {
					let average = Math.round(r.average.score*10)/10;
					if(average%1 === 0){
						average = ''+average+'.0';
					}
					dataRows[i][0] += '<td>'+r.total.score+'</td><td data-average="'+r.average.score+'">'+average+'</td></tr>';
				});
			}
			scoreBoardString += dataRows.sort((s1, s2) => s2[1]-s1[1]).map(s => s[0]).join('')+'</table>';
			scoreBoard.innerHTML = scoreBoardString;
			let firstMover = matchLog.log.get(0).value.mover;
			let baseDown = replay.arenaResult.settings.gameboard.boardLength;
			let baseUp = baseDown*2 + 1;
			let slider = document.getElementById('slider');
			{
				let first = matchLog.log.get(0).value.mover;
				document.getElementById('first-player').innerHTML = first;
				let secund = document.getElementById('secund-player')
				for(let index = 0; index < matchLog.log.length; index++) {
					const log = matchLog.log.get(index).value;
					if(log.mover !== first){
						secund.innerHTML = log.mover;
					}
				}
				if(secund.innerHTML === ''){
					secund.innerHTML = first;
				}
			}
			buttonBack.addEventListener('click', step);
			buttonNext.addEventListener('click', step);
			slider.max = matchLog.log.length;
			slider.addEventListener('input', event=>{
				setBoard(slider.valueAsNumber - 1);
			});
			window.onresize = resizeGameboard;
			setBoard();
			function step(mouseEvent){
				slider.valueAsNumber += mouseEvent.target === buttonNext ? 1 : -1;
				setBoard(slider.valueAsNumber - 1);
			}
			function setBoard(logIndex=-1){
				buttonBack.disabled = slider.valueAsNumber === 0;
				let isFinished = slider.valueAsNumber === matchLog.log.length || matchLog.log.length === 0;
				buttonNext.disabled = isFinished;
				scoreBoard.parentElement.parentElement.style.display = isFinished ? '' : 'none';
				let log = -1 < logIndex ? matchLog.log.get(logIndex).value : null;
				let state = log !== null ? log.gameboard.slice() : null;
				if(log !== null && log.mover !== firstMover){
					for(let i = 0; i < state.length/2; i++) {
						state.push(state.shift())
					}
				}
				// Rezero base columns.
				document.getElementById('column-down').innerHTML = '<div id="square_' + baseDown + '" class="square">' + (state === null ? 0 : state[baseDown]) + '</div>';
				document.getElementById('column-up').innerHTML = '<div id="square_' + baseUp + '" class="square square-up">' + (state === null ? 0 : state[baseUp]) + '</div>';

				// Recreate up and down rows.
				let rowDown = document.getElementById('rowDown');
				let rowUp = document.getElementById('rowUp');
				rowUp.innerHTML = '';
				rowDown.innerHTML = '';
				let boardSize = replay.arenaResult.settings.gameboard.boardLength;
				let startValue = replay.arenaResult.settings.gameboard.startValue;
				for(let index = 0; index < boardSize; index++){
					let indexDown = index;
					let indexUp = (boardSize*2 - index);
					rowDown.innerHTML += '<div id="square_' + indexDown + '" class="square">' + (state === null ? startValue : state[indexDown]) + '</div>';
					rowUp.innerHTML += '<div id="square_' + indexUp + '" class="square square-up">' + (state === null ? startValue : state[indexUp]) + '</div>';
				}

				let teams = replay.arenaResult.teams;
				document.getElementById('square_'+baseDown).style.backgroundColor = teams[0].color.RGB;
				document.getElementById('square_'+baseUp).style.backgroundColor = teams[1].color.RGB;

				resizeGameboard();
			}
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
		}
		replay.arenaResult.matchLogs.forEach((matchLog, index) => {
			let option = document.createElement('option');
			selectMatches.appendChild(option);
			option.innerHTML = 'Match '+(index+1);
			option.dataset.index = index;
			if(index === 0){
				selectMatches.onchange();
			}
			if(replay.arenaResult.matchLogs.length === 1){
				selectMatches.style.disabled = 'none';
			}
		});
	});
}
