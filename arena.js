'use strict'
importScripts('https://chrisacrobat.github.io/js-compilation/CreateWorkerFromRemoteURL.js');
function isGameFinished(gameboard){
	let ai_1 = 0;
	let ai_2 = 0;
	let length = gameboard.length;
	let lengthHalf = (length/2)-1;
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
	if(!rules.includes('disable_empty_capture')){
		if(move < ownStore && 1 === gameboard[move]){
			let score = gameboard[move];
			gameboard[move] = 0;
			let oppositeSide = size - move - 1;
			score += gameboard[oppositeSide];
			gameboard[oppositeSide] = 0;
			gameboard[ownStore] += score;
		}
	}
	return {moveAgain: move === ownStore, gameboard, gameboard};
}
function sumBoard(gameboard){
	let score = 0;
	let length = gameboard.length;
	let lengthHalf = length/2;
	let ai_1 = gameboard[lengthHalf];
	let ai_2 = gameboard[0];
	for(let i = 1; i < length; i++){
		if(i === lengthHalf){
			ai_1 += score;
			i++;
			score = 0;
		}
		score += gameboard[i];
	}
	ai_2 += score;
	return {ai_1: ai_1, ai_2: ai_2};
}
function sumScore(scoreArray, gameboardLength, startValue, aiList){
	let ai_1 = 0;
	let ai_2 = 0;
	let length = scoreArray.length;
	let boardValue = gameboardLength*startValue;
	let localScore_ai_1 = undefined;
	let localScore_ai_2 = undefined;
	let errorFound = false;
	for(const score of scoreArray){
		localScore_ai_1 = score['ai_1'];
		localScore_ai_2 = score['ai_2'];
		errorFound = boardValue != localScore_ai_1 + localScore_ai_2;
		if(errorFound){
			break;
		}
		ai_1 += score['ai_1'];
		ai_2 += score['ai_2'];
	}
	if(errorFound){
		ai_1 = 'Error';
		ai_2 = 'Sum(' + localScore_ai_1 + ', ' . localScore_ai_2 + ') != ' + boardValue;
	}else{
		ai_1 /= length;
		ai_2 /= length;
	}
	return [{name: aiList[0].name, score: ai_1}, {name: aiList[1].name, score: ai_2}];
}
function callAI(matchList, matchIndex, aiIndex, data){
	let match = matchList[matchIndex];
	let worker = match.ai[aiIndex%2].worker;
	if(worker instanceof Worker){
		if(worker.onmessage === undefined){
			worker.onmessage = messageEvent => {
				worker.onmessage = undefined;
				let selectedMove = messageEvent.data;
				let moveData = doMove(match.gameboard, selectedMove, match.settings.rules);
				match.gameboard = moveData['gameboard'];

				match.history.push({aiIndex: aiIndex%2, gameboard: match.gameboard.slice()});

				// Switch AI
				if(!moveData['moveAgain']){
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
					match.score = sumBoard(match.gameboard);
					let done = true;
					let scoreArray = [];
					matchList.forEach(match => {
						done &= match.score !== undefined;
						scoreArray.push(match.score);
					});
					if(done){
						let score = sumScore(scoreArray, match.gameboard.length-2, match.settings.startValue, match.ai);
						postMessage({type: 'Done', message: {id: data.id, history: match.history, score: score}});
					}
				}else{
					callAI(matchList, matchIndex, aiIndex, data);
				}
			};
			worker.onerror = error => {
				postMessage({type: 'DNF', message: {error: error}});
			}
		}
		worker.postMessage({gameboard: match.gameboard, settings: match.settings, id: data.id});
	}else{
		worker.then(worker_real => {
			match.ai[aiIndex%2].worker = worker_real;
			callAI(matchList, matchIndex, aiIndex, data);
		});
	}
}
onmessage = messageEvent => {
	let gameboard = [];
	for(let i = 0; i < 2; i++){
		for(let n=0; n < messageEvent.data.arena.settings.boardLength; n++){
			gameboard.push(messageEvent.data.arena.settings.startValue);
		}
		gameboard.push(0);
	}
	let matchList = [];
	for(const participant_1 of messageEvent.data.arena.participants){
		for(const participant_2 of messageEvent.data.arena.participants){
			if(participant_1 !== participant_2){
				let match = [];
				matchList.push(match);
				while(match.length < messageEvent.data.arena.settings.averageOf){
					match.push({
						ai: [
							{
								worker: createWorkerFromRemoteURL(participant_1.src, true),
								name: participant_1.name
							},{
								worker: createWorkerFromRemoteURL(participant_2.src, true),
								name: participant_2.name
							}
						],
						score: undefined,
						history: [],
						gameboard: gameboard.slice(),
						settings: messageEvent.data.arena.settings
					});
					callAI(match, match.length-1, 0, messageEvent.data);
				}
			}
		}
	}
	postMessage({type: 'Pending', message: matchList.length});
}
