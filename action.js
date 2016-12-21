function funcNothing(){}

var onJSONP = funcNothing;

//JSONP to get the json file of Subtitle.
function querySubtitle(srcName,callback) {
	window.onJSONP = callback;
	var s = document.createElement("script");
	s.src = srcName;
	s.onload = function() {
		window.onJSONP = funcNothing;
	}
	document.body.appendChild(s);

}



function SubtitlePlayer(subObj) {
	this.setup(subObj);
	
}

(function () {

	function string2Ms(str){
		var arr = /(\d+):(\d+):(\d+),(\d+)/.exec(str);
		if (arr) {
			var hour = Number(arr[1]);
			var min = Number(arr[2]);
			var sec =  Number(arr[3]);
			var ms = Number(arr[4]);
			
			min += hour * 60;
			sec += min * 60;
			ms +=  sec*1000;
			return ms;
		} else {
			return 0;
		}
	}
	function ms2String(ms) {
		var temp = ms;
		var ms = temp % 1000;
		temp = (temp - ms) / 1000;
		var sec = temp % 60;
		temp = (temp - sec) / 60;
		var min = temp % 60;
		temp = (temp - min) / 60;
		var hour = temp;
		
		var strSec = String(sec);
		if (strSec.length === 1) {strSec = "0"+strSec;}  
		var strMin = String(min);
		if (strMin.length === 1) {strMin = "0"+strMin;}
		var out = strMin + ":" + strSec;
		if (hour > 0) {
			out = String(hour)+":"+out;
		}
		return out;
	}
	
	function Event(t,a,i) {
		this.time = t;
		this.action = a;
		this.subIndex = i;
	}
	Event.prototype = {
		time: 0,
		action: "",
		subIndex: -1
	};
	function toEventList(obj) {
		var byStart = [];
		for(var i in obj) {
			var block = obj[i];
			var start = block["start"];
			var end  = block["end"];
			block["start.ms"]=string2Ms(start);
			block["end.ms"]=string2Ms(end);
			
			byStart.push(block);
		}
		byStart.sort(function(a,b){
			var diff = a["start.ms"] - b["start.ms"];
			if (diff === 0) {
				diff = a.index - b.index;
			}
			return diff;
		});
		
		var events = [];
		for(var i=0;i<byStart.length;i++) {
			block = byStart[i];
			
			var startTime = block["start.ms"];
			if(events.length > 0) {
				previousEvent = events[events.length-1];
				if (previousEvent.time >= startTime && previousEvent.action === "hide") {
					events.pop(); // delete tast hide event, if it's a late hide
				}
			}
			
			events.push(new Event(startTime, "show", block.index));
			//console.log(ms2String(startTime), "show", block.index);
			var endTime = block["end.ms"];
			if(endTime > startTime) {
				events.push(new Event(endTime, "hide", block.index));
				//console.log(ms2String(endTime), "hide", block.index);
			}
		}

		return events;
	}
	
		
	
	

	var player = null;
	var timeoutHandler = 0;
	var timebar = null;
	

		
	function work() {
		var arr = player.eventList;
		var map = player.subtitles;
		
		
		
		var lastSubTime = player.progressTime;
		var lastRealTime = player["_time"];
		var now = Date.now();
		
		var nowSubTime = now - lastRealTime + lastSubTime;
		var index = findNextSubtitle(arr, nowSubTime);
		
		
		var currentIndex = index - 1;
		if(currentIndex < 0) {
			currentIndex = 0;
			index = 1;
		}
		var e = arr[currentIndex];
	

		switch(e.action) {
		case "show":
			show(map[e.subIndex]);
			break;
		case "hide":
			hide();
		}
		
		
		player["_time"] = now;
		timebar.update(player.progressTime = nowSubTime);

		
		if (index < arr.length) {
			var nextTime = arr[index].time-nowSubTime;
			if (nextTime > 1000) {
				nextTime = 1000;
			}
			timeoutHandler = setTimeout(work, nextTime);
		}
	}
	
	
	function show(sub) {
		document.getElementById("text1").innerHTML = "";
		document.getElementById("text2").innerHTML = "";
		
		for(var key in sub) {
			var arr = /subtitle.(\d+)/.exec(key);
			if (arr) {
				var num = arr[1];
				document.getElementById("text"+num).innerHTML += sub[key];
			}
		}
	}
	
	
	function hide() {
		document.getElementById("text1").innerHTML = "";
		document.getElementById("text2").innerHTML = "";
	}
	function TimeBar (t) {
		this.total = t;
		this.current = 0;
		this.setup();
	}
	
	TimeBar.prototype = {
		total: 0,
		current: 0,
		setup: function () {
			document.getElementById("total").innerHTML = ms2String(this.total);
		},
		update: function (v) {
			this.current = v;
			
			document.getElementById("time").innerHTML = ms2String(v);
			var percent = Math.round(v/this.total*10000);
			var markerL = document.getElementById("markerL");
			markerL.style.flexGrow = markerL.style.flexShrink = percent;
			var markerR = document.getElementById("markerR");
			markerR.style.flexGrow = markerR.style.flexShrink = 10000-percent;
			
		}
	}
	
	
	function createTimeBar() {
		var arr = player.eventList;
		var lastEvent = arr[arr.length-1];
		return new TimeBar(lastEvent.time);
	}
	
	function updateTimeBar(nowSubTime) {
		var str = ms2String(nowSubTime);
		document.getElementById("time").innerHTML = str;
	}
	
	
	function findNextSubtitle(arr, targetTime) {
	
		// exclude lower and upper themselves
		var lower = -1;
		var upper = arr.length;
		
		var mid = Math.floor((lower + upper)/2); 
		while(upper - lower > 1) {
			var midEvent = arr[mid];
			var midTime = midEvent.time;
			
			//console.log(lower, upper, midTime, progressTime)
			if (targetTime < midTime) {
				upper = mid;
			} else if (targetTime > midTime ) {
				lower = mid;
			} else {
				return mid + 1; // always the next 
			}
			mid = Math.floor((lower + upper)/2);
		}
		
		return upper;
	}

	function kickoff(obj) {
		player = obj;
		timebar = createTimeBar();
		timebar.update(player.progressTime);

	}
	function pause() {
		console.log("paused");
		clearTimeout(timeoutHandler);
		player.playing = false;
	}
	
	function resume () {
		console.log("resume");
		player.playing = true;
		player["_time"] = Date.now();
		timeoutHandler = setTimeout(work, 0);
	}
	
	function jump (percent) {
		
		var t = timebar.total;
		var c = timebar.current;
		var p = c/t*100;
		
		p += percent;
		if (p < 0) { p  = 0;}
		else if ( p > 100) {p = 100;}
		
		var v = Math.round(t * p / 100);
		//console.log("jump", percent,t,c, p, v); 
		
		player["_time"] = Date.now();
		timebar.update(player.progressTime = v);
		
	}
	
	
	
	SubtitlePlayer.prototype= {
		subtitles: null,
		eventList: null,
		progressTime: 0,
		playing: false,
		"_time" : 0,
		"setup": function (obj) {
			this.subtitles = obj;
			this.eventList = toEventList(obj);
			this.progressTime = 0;
			this["_time"] = Date.now();
			kickoff(this);
		},
		"pause": function () {
			pause();
		},
		"resume": function () {
			resume();
		},
		"jump": function (percent) {
			jump(percent);
		}
	}
})();




(function () {
	var jsonpFile = "my.srt.jsonp";
	var arr = /\?(.+\.jsonp)/.exec(location.search);
	if ( arr ) {
		jsonpFile = arr[1];
	}
	
	document.title = "Subtitle in "+jsonpFile;
	
	querySubtitle( jsonpFile , function(obj){
		var player = new SubtitlePlayer(obj);
		document.body.addEventListener("keydown", function(e) {
			if (e.key === " ") {
				if (player.playing) player.pause();
				else player.resume();
			}

			if (e.code === "KeyB" || e.code === "KeyF") {
				var percent = 10;
				if (e.shiftKey) {percent = 1;}
				if (e.code === "KeyB") {percent = - percent;}
				
				player.jump(percent);
			}
			
		});
		
	});
})();


