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
function sumScore(scoreArray, gameboardLength, startValue){
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
	return {ai_1: ai_1, ai_2: ai_2};
}
function callAI(matchList, matchIndex, aiIndex, data){
	let match = matchList[matchIndex];
	let ai = match.ai[aiIndex%2];
	if(ai instanceof Worker){
		ai.onmessage = messageEvent => {
			ai.onmessage = undefined;
			let selectedMove = messageEvent.data;
			let moveData = doMove(match.gameboard, selectedMove, match.settings.rules);
			match.gameboard = moveData['gameboard'];

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
					let score = sumScore(scoreArray, match.gameboard.length-2, match.settings.startValue);
					postMessage({id: data.id, score: score});
				}
			}else{
				callAI(matchList, matchIndex, aiIndex, data);
			}
		};
		ai.postMessage({gameboard: match.gameboard, settings: match.settings, id: data.id});
	}else{
		ai.then(worker => {
			match.ai[aiIndex%2] = worker;
			callAI(matchList, matchIndex, aiIndex, data);
		});
	}
}
onmessage = messageEvent => {
	// Init simulation
	let matchList = [];
	let match = 0;
	while(match < messageEvent.data.arena.settings.matchs){
		matchList[match] = {
			ai: [
				createWorkerFromRemoteURL(messageEvent.data.arena.participants[0], true),
				createWorkerFromRemoteURL(messageEvent.data.arena.participants[0], true)
			],
			score: undefined,
			gameboard: [],
			settings: messageEvent.data.arena.settings
		};

		// Init gameboard
		for(let i = 0; i < 2; i++){
			for(let n=0; n < messageEvent.data.arena.settings.boardLength; n++){
				matchList[match].gameboard.push(messageEvent.data.arena.settings.startValue);
			}
			matchList[match].gameboard.push(0);
		}

		callAI(matchList, match, 0, messageEvent.data);
		match++;
	}
}
