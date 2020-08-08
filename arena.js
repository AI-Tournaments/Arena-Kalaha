'use strict'
importScripts('https://chrisacrobat.github.io/js-compilation/CreateWorkerFromRemoteURL.js');
importScripts('https://ai-tournaments.github.io/AI-Tournaments-Website/Arena/participants.js');
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
function sumScore(scoreArray, gameboardLength, startValue, participants){
	let ai_1 = 0;
	let ai_2 = 0;
	let length = scoreArray.length;
	let boardValue = gameboardLength*startValue;
	let localScore_ai_1 = undefined;
	let localScore_ai_2 = undefined;
	let errorFound = false;
	for(const score of scoreArray){
		localScore_ai_1 = score[0];
		localScore_ai_2 = score[1];
		errorFound = boardValue != localScore_ai_1 + localScore_ai_2;
		if(errorFound){
			break;
		}
		ai_1 += score[0];
		ai_2 += score[1];
	}
	if(errorFound){
		ai_1 = 'Error';
		ai_2 = 'Sum(' + localScore_ai_1 + ', ' . localScore_ai_2 + ') != ' + boardValue;
	}else{
		ai_1 /= length;
		ai_2 /= length;
	}
	return [{name: participants[0].name, score: ai_1}, {name: participants[1].name, score: ai_2}];
}
function callParticipant(matchList, matchIndex, aiIndex){
	let match = matchList[matchIndex];
	let participant = match.participants[aiIndex%2];
	let worker = participant.worker;
	if(worker instanceof Worker){
		if(worker.onmessage === null){
			worker.onmessage = messageEvent => {
				worker.lastCalled = undefined;
				worker.onmessage = undefined;
				let selectedMove = messageEvent.data;
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
					match.score = sumBoard(match.gameboard);
					let done = true;
					let scoreArray = [];
					let historyArray = [];
					matchList.forEach(match => {
						done &= match.score !== undefined;
						scoreArray.push(match.score);
						historyArray.push(match.history);
					});
					if(done){
						let score = sumScore(scoreArray, match.gameboard.length-2, match.settings.gameboard.startValue, match.participants);
						postMessage({type: 'FinalScore', message: {score: score, settings: match.settings, history: historyArray}});
					}
				}else{
					callParticipant(matchList, matchIndex, aiIndex);
				}
			};
			worker.onerror = errorEvent => {
				postMessage({type: 'Aborted', message: {name: participant.name, error: errorEvent.message}});
			}
		}
		worker.lastCalled = new Date().getTime();
		worker.postMessage({
			gameboard: match.gameboard,
			settings: match.settings,
			opponent: match.settings.general.displayOpponents ? match.participants[(aiIndex+1)%2].name : null
		});
	}else{
		worker.then(worker_real => {
			match.participants[aiIndex%2].worker = worker_real;
			callParticipant(matchList, matchIndex, aiIndex);
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
	let matches = messageEvent.data.arena.settings.gameboard.playBothSides ? 2 : 1;
	for(let i = 0; i < 2; i++){
		for(let n=0; n < messageEvent.data.arena.settings.gameboard.boardLength; n++){
			gameboard.push(messageEvent.data.arena.settings.gameboard.startValue);
		}
		gameboard.push(0);
	}
	let matchList = [];
	let participants=[];
	let participant_1 = messageEvent.data.arena.participants[0][0];
	let participant_2 = messageEvent.data.arena.participants[1][0];
	for(let i = 0; i < matches; i++){
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
			gameboard: gameboard.slice(),
			settings: messageEvent.data.arena.settings
		};
		participants = participants.concat(match.participants);
		matchList.push(match);
		callParticipant(matchList, matchList.length-1, 0);
		let temp = participant_1;
		participant_1 = participant_2;
		participant_2 = temp;
	}
	executionWatcher(messageEvent.data.arena.settings.general.timelimit_ms, participants);
	postMessage({type: 'Pending', message: matchList.length});
}
