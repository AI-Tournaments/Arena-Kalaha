'use strict'
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
		if(move < size-1){	// If on last, do not add. Is opposite goal.
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
	participants.addScore(0, score[0]);
	participants.addScore(1, score[1]);
}
function callParticipant(match, aiIndex){
	let participant = match.participants.get(aiIndex%2, 0);
	if(participant.onmessage === null){
		participant.onmessage = messageEvent => {
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
					match.participants.terminateAllWorkers();
					let score = sumScore(sumBoard(match.gameboard), match.gameboard.length-2, match.settings.gameboard.startValue, match.participants);
					if(score === null){
						postAbort(participant, 'General error - Illegal final score.');
					}else{
						postDone(match.participants, match.history);
					}
				}else{
					callParticipant(match, aiIndex);
				}
			}else{
				postAbort(participant, 'Illegal move.');
			}
		};
		participant.onerror = errorEvent => {
			postAbort(participant, errorEvent.message);
		}
	}
	participant.postMessage(match.gameboard);
}
function postDone(participants, log){
	postMessage({type: 'Done', message: {score: participants.getScores(), settings: participants.getSettings(), log: log}});
}
function postAbort(participant='', error=''){
	let participantName = participant.name === undefined ? participant : participant.name;
	postMessage({type: 'Aborted', message: {participantName: participantName, error: error}})
}
ArenaHelper.init = participants => {
	let gameboard = [];
	for(let i = 0; i < 2; i++){
		for(let n=0; n < messageEvent.data.settings.gameboard.boardLength; n++){
			gameboard.push(messageEvent.data.settings.gameboard.startValue);
		}
		gameboard.push(0);
	}
	let match = {
		participants: null,
		score: undefined,
		history: [],
		gameboard: gameboard,
		settings: messageEvent.data.settings
	};
	match.participants = participants;
	callParticipant(match, 0);
}
