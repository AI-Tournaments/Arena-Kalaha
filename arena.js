'use strict'
importScripts('https://ai-tournaments.github.io/AI-Tournaments/Arena/participants.js');
importScripts('https://chrisacrobat.github.io/js-compilation/CreateWorkerFromRemoteURL.js');
function isGameFinished(gameboard){
	let ai_1 = 0;
	let ai_2 = 0;
	let length = gameboard.length;
	let lengthHalf = (length/2)-1;
	length--;
	for(let i = 0; i < length; i++){
		if(i === lengthHalf){
			i++;
		}
		let score = gameboard[i];
		if(i < lengthHalf){
			ai_1 += score;
		}else{
			ai_2 += score;
		}
	}
	return ai_1 === 0 || ai_2 === 0;
}
function doMove(gameboard, move, rules){
	let size = gameboard.length;
	let steps = gameboard[move];
	let ownStore = (size/2)-1;
	gameboard[move] = 0;
	while(0 < steps){
		move++;
		move %= size;
		if(move < size-1){	// If on last, do not add. Opposite goal.
			steps--;
			gameboard[move] += 1;
		}
	}
	if(rules.empty_capture){
		if(move < ownStore && 1 === gameboard[move]){
			let score = gameboard[move];
			gameboard[move] = 0;
			let oppositeSide = size - move - 2;
			score += gameboard[oppositeSide];
			gameboard[oppositeSide] = 0;
			gameboard[ownStore] += score;
		}
	}
	return {moveAgain: move === ownStore, gameboard, gameboard};
}
function sumBoard(gameboard){
	let data = [0,0];
	for(let i = 0; i < gameboard.length; i++){
		data[i < gameboard.length/2 ? 0 : 1] += gameboard[i];
	}
	return data;
}
function sumScore(score, gameboardLength, startValue, participants){
	let boardValue = gameboardLength*startValue;
	let errorFound = boardValue != score[0] + score[1];
	if(errorFound){
		return null;
	}
	return [{name: participants[0].name, score: score[0]}, {name: participants[1].name, score: score[1]}];
}
function callParticipant(match, aiIndex){
	let participant = match.participants[aiIndex%2];
	let worker = participant.worker;
	if(worker instanceof Worker){
		if(worker.onmessage === null){
			worker.onmessage = messageEvent => {
				worker.lastCalled = undefined;
				worker.onmessage = undefined;
				let selectedMove = messageEvent.data;
				if(0 <= selectedMove && selectedMove < match.gameboard.length/2 && 0 < match.gameboard[selectedMove]){
					let moveData = doMove(match.gameboard, selectedMove, match.settings.rules);
					match.gameboard = moveData.gameboard;
					match.history.push({mover: participant.name, gameboard: match.gameboard.slice()});

					// Switch AI
					if(!moveData.moveAgain){
						aiIndex++;
						for(let i=0; i < match.gameboard.length/2; i++){
							match.gameboard.push(match.gameboard.shift());
						}
					}
					if(isGameFinished(match.gameboard)){
						if(aiIndex%2){
							for(let i=0; i < match.gameboard.length/2; i++){
								match.gameboard.push(match.gameboard.shift());
							}
						}
						match.participants.forEach(participant => {
							participant.worker.lastCalled = null;
						});
						let score = sumScore(sumBoard(match.gameboard), match.gameboard.length-2, match.settings.gameboard.startValue, match.participants);
						if(score === null){
							postMessage({type: 'Aborted', message: {name: participant.name, error: 'General error - Illegal final score.'}});
						}else{
							postMessage({type: 'FinalScore', message: {score: score, settings: match.settings, history: match.history}});
						}
					}else{
						callParticipant(match, aiIndex);
					}
				}else{
					postMessage({type: 'Aborted', message: {name: participant.name, error: 'Illegal move.'}});
				}
			};
			worker.onerror = errorEvent => {
				postMessage({type: 'Aborted', message: {name: participant.name, error: errorEvent.message}});
			}
		}
		worker.lastCalled = new Date().getTime();
		let opponent = null;
		let opponentParticipant = match.participants[(aiIndex+1)%2];
		if(match.settings.general.displayOpponents === 'Yes'){
			opponent = opponentParticipant.name;
		}else if(match.settings.general.displayOpponents === 'AccountOnly'){
			opponent = opponentParticipant.name.split('/')[0];
		}
		worker.postMessage({
			gameboard: match.gameboard,
			settings: match.settings,
			opponent: opponent
		});
	}else{
		worker.then(worker_real => {
			match.participants[aiIndex%2].worker = worker_real;
			callParticipant(match, aiIndex);
		});
	}
}
function executionWatcher(executionLimit=1000, participants=[]){
	participants.forEach(participant => {
		let executionTimeViolation = participant.worker.lastCalled === undefined ? false : executionLimit < new Date().getTime() - participant.worker.lastCalled;
		if(participant.worker.lastCalled === null || executionTimeViolation){
			participants.splice(participants.indexOf(participant), 1);
			if(executionTimeViolation){
				postMessage({type: 'Aborted', message: {name: participant.name, error: 'Execution time violation.'}});
				participant.worker.terminate();
			}
		}
	});
	setTimeout(executionWatcher, executionLimit, executionLimit, participants);
}
onmessage = messageEvent => {
	let gameboard = [];
	for(let i = 0; i < 2; i++){
		for(let n=0; n < messageEvent.data.arena.settings.gameboard.boardLength; n++){
			gameboard.push(messageEvent.data.arena.settings.gameboard.startValue);
		}
		gameboard.push(0);
	}
	let participant_1 = messageEvent.data.arena.participants[0][0];
	let participant_2 = messageEvent.data.arena.participants[1][0];
	let match = {
		participants: [
			{
				worker: createWorkerFromRemoteURL(participant_1.url, true),
				name: participant_1.name
			},{
				worker: createWorkerFromRemoteURL(participant_2.url, true),
				name: participant_2.name
			}
		],
		score: undefined,
		history: [],
		gameboard: gameboard,
		settings: messageEvent.data.arena.settings
	};
	callParticipant(match, 0);
	executionWatcher(messageEvent.data.arena.settings.general.timelimit_ms, match.participants);
	postMessage({type: 'Pending', message: 1});
}
