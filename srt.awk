BEGIN {
	blockIndex = 0
	
	isText = 0
	textIndex = 0

	/* map [blockIndex][subKey] = string */
}

{
	isText = 1
}

/^\s*$/ {
	isText = 0
}

/^[0-9]+\s*$/ || (NR == 1 && /^.[0-9]+$/) { 
	/* there is a weird char at the first line */

	isText = 0
	textIndex = 0
	
	match($0, /([0-9]+)/, arr)
	blockIndex = arr[1]
	map[blockIndex]["index"] = blockIndex
	
}

/^[0-9]+:[0-9]+:[0-9]+,[0-9]+\s+-->\s+[0-9]+:[0-9]+:[0-9]+,[0-9]+\s*$/ {
	isText = 0
	textIndex = 0
	
	/* time range example 00:00:02,920 --> 00:00:04,820 */
	match($0, /([0-9]+:[0-9]+:[0-9]+,[0-9]+)\s+-->\s+([0-9]+:[0-9]+:[0-9]+,[0-9]+)/, arr)
	map[blockIndex]["start"] = arr[1]
	map[blockIndex]["end"] = arr[2]
}

{
	if (isText) {
		textIndex ++
		text = $0
		/* escape the quote */
		gsub(/"/, "\\\"" , text) 
		map[blockIndex]["subtitle." textIndex] = text
	}
}

END {
	fLine="\r\n"
	fTab="  "
	
	printf("onJSONP(%s",fLine)
	
	printf("{%s",fLine)
	
	for (key in map) {
		
		printf("%s%d: {%s", fTab, key, fLine)
		
		printf("%s\"start\": \"%s\",%s", (fTab fTab), map[key]["start"], fLine)
		printf("%s\"end\": \"%s\",%s", (fTab fTab), map[key]["end"], fLine)
		for( subKey in map[key]) {
			if(match(subKey, /subtitle\.[0-9]+/)) {
				printf("%s\"%s\": \"%s\",%s", (fTab fTab), subKey, map[key][subKey], fLine)
			}
		}
		printf("%s\"index\": %s%s", (fTab fTab), map[key]["index"], fLine)
		
		/*last element no comma*/
		if (key == blockIndex) {
			printf("%s}%s", fTab, fLine)
		} else {
			printf("%s},%s", fTab, fLine)
		}
	}
	
	printf("}%s",fLine)
	
	printf(")%s",fLine)
}