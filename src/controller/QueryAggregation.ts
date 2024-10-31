import Room from "./rooms/Room";
import Section from "./sections/Section";
import QueryUtils from "./QueryUtils";
import { InsightError } from "./IInsightFacade";

export default class QueryAggregation {
	private sectionsDatabase: Map<string, Section[]>;
	private roomsDatabase: Map<string, Room[]>;
	private utils: QueryUtils;
	public sectionOrRoom: string;
	public queryingIDString: string;
	private sDSList: string[];
	private rDSList: string[];
	private groupKeys: string[];

	constructor(sectionsDatabase: Map<string, Section[]>, roomsDatabase: Map<string, Room[]>) {
		this.sectionsDatabase = sectionsDatabase;
		this.roomsDatabase = roomsDatabase;
		this.utils = new QueryUtils();
		this.sectionOrRoom = "";
		this.queryingIDString = "";
		this.sDSList = Array.from(sectionsDatabase.keys());
		this.rDSList = Array.from(roomsDatabase.keys());
		this.groupKeys = [];
	}

	public setIDs(sDSList: string[], rDSList: string[]): void {
		this.rDSList = rDSList;
		this.sDSList = sDSList;
	}

	public async handleGroupBy(
		group: unknown,
		filteredSOR: Object[],
		noFilter: boolean,
		queryingIDString: string,
		sectionOrRoom: string
	): Promise<Record<string, any>> {
		this.sectionOrRoom = sectionOrRoom;
		this.queryingIDString = queryingIDString;

		let dataset: Object[] = [];
		let groupedResults: Record<string, any> = {};

		// get the group keys from group in query
		this.groupKeys = await this.checkGroupKeys(group);

		// if no filter has been applied,
		if (noFilter) {
			dataset = await this.getDataset();
		} else {
			dataset = filteredSOR;
		}

		groupedResults = await this.groupByKeys(dataset);
		return groupedResults;
	}

	// chatgpt generated but altered to fit our code
	private async groupByKeys(dataset: Object[]): Promise<any> {
		return dataset.reduce((acc, SOR) => {
			// Create nested structure based on keys
			this.groupKeys.reduce((nestedAcc, key, index) => {
				const groupKey = (SOR as Record<string, any>)[key];
				const nestedAccObj = Object(nestedAcc);

				// If this is the last key, store the array of items
				if (index === this.groupKeys.length - 1) {
					if (!nestedAccObj[groupKey]) {
						nestedAccObj[groupKey] = [];
					}
					nestedAccObj[groupKey].push(SOR);
				} else {
					// Create an empty object if key doesn't exist yet
					if (!nestedAccObj[groupKey]) {
						nestedAccObj[groupKey] = {};
					}
				}

				return nestedAccObj[groupKey];
			}, acc);

			return acc;
		}, {});
	}

	private async getDataset(): Promise<Object[]> {
		let dataset: Object[] | undefined = [];
		if (this.sectionOrRoom === "section") {
			dataset = this.sectionsDatabase.get(this.queryingIDString);
		} else if (this.sectionOrRoom === "room") {
			dataset = this.roomsDatabase.get(this.queryingIDString);
		} else {
			throw new InsightError("sections or room not defined in getDataset.");
		}
		if (dataset === undefined) {
			// should not be possible given current implementation of other methods for query
			throw new InsightError("Can't find querying dataset.");
		} else {
			return dataset;
		}
	}

	private async checkGroupKeys(group: unknown): Promise<string[]> {
		const groupKeys: string[] = [];
		if (this.utils.isStringArray(group)) {
			const groupArr = Array(group);
			if (groupArr.length === 0) {
				throw new InsightError("GROUP must be a non-empty array");
			} else {
				for (const key of groupArr) {
					const keyStr = String(key);
					const field = keyStr.split("_")[1];
					const idstring = keyStr.split("_")[0];

					this.sectionOrRoom = this.utils.checkIDString(
						this.sDSList,
						this.rDSList,
						this.sectionOrRoom,
						this.queryingIDString,
						idstring
					);
					this.queryingIDString = idstring;

					if (this.checkValidKey(field)) {
						groupKeys.push(keyStr);
					} else {
						throw new InsightError(`Invalid key ${keyStr} in GROUP`);
					}
				}
			}
		} else {
			throw new InsightError("GROUP must be a string array");
		}
		return groupKeys;
	}

	// if the field is valid, return true, if sectionOrRoom is somehow empty throw error
	private checkValidKey(field: string): boolean {
		if (this.sectionOrRoom === "section") {
			if (this.utils.mFieldsSection.includes(field) || this.utils.sFieldsSection.includes(field)) {
				return true;
			}
		} else if (this.sectionOrRoom === "room") {
			if (this.utils.mFieldsRoom.includes(field) || this.utils.sFieldsRoom.includes(field)) {
				return true;
			}
		} else {
			throw new InsightError("section or room undefined");
		}
		return false;
	}

	public async handleApply(apply: unknown, groupedResults: Record<string, any>): Promise<Object[]> {
		let transformedResults: Object[] = [];
		let applyRules: Record<string, [string, string]> = {};

		// campus explorer allows empty applyarrays, so no rules is okay
		applyRules = await this.checkApplyRules(apply);
		transformedResults = await this.applyRulesRecursive(groupedResults, applyRules, 0, []);
		return transformedResults;
	}

	/*
Record<string, any>

("course name", "sections_instructor")


groupKeys = [sections_title, sections_instructor];
groupKeysIterator = 0;
stopping_cond groupKeysIterator = groupKeys.length -1;

					token, target_key
Record <string, [string, string]>
avgSeats


keysList = []
1. "310" keysList = []
keysList.push("310")
keysList = ["310"]
ObjectList = Object[]
for(key in "310".value)
	ObjectList.push(...recursion(keysList, groupKeysIterator+1));
return ObjectList

2. "Jean" keysList = ["310"], groupKeysIterator = 1
keysList.push("Jean")
keysList = ["310", "Jean"]

SORArr = "Jean".value
reached stopping_cond then:
	const group = new Object();
	for(let i = 0; i < groupKeys.length; i++) {
		group[groupKeys[i]] = keysList[i];
	}
	for(applyKey of applyKeys.keys()) {
		group[applyKey] = helper(token, target_key, SORArr);
	}
	return [Object];

//helper() {
	key = targetkey.split[1]
	targetFieldList = any[]

	for SOR of SORArr {
		targetFieldList.push((SOR as Record<string, any>)[key]);
	}

	if (checkTargetKey() === "number") {
		if token === max:
			return Math.max(...targetFieldList);
		else if token === min:
			return Math.min(...targetFieldList);
		else if token === avg:
			const sum = targetFieldList.reduce((acc, num) => acc + num, 0);
			const avg = sum / targetFieldList.length;
			return avg;
		else if token === sum:
			const sum = targetFieldList.reduce((acc, num) => acc + num, 0);
			return sum;
		else if token === count:
			return Array.from(toSet(targetFieldList));
	} else {
		if token === count:
			return Array.from(toSet(targetFieldList));
	}
}

// checks if target key is
checkTargetKey(key): string {
	if(sectionOrRoom === "section") {
		if(key in mfieldsection) {
			return "number"
		} else {
			return "string"
		}
	} else if (sectionOrRoom === "room") {
		if(key in mfieldroom) {
			return "number"
		} else
			return "string"
	} else {
		throw InsightError;
	}
}

"310" : {
	"Jean" : [
		{ "sections_uuid": "1", "sections_instructor": "Jean",  "sections_avg": 90, "sections_title" : "310"},

 		{ "sections_uuid": "2", "sections_instructor": "Jean",  "sections_avg": 80, "sections_title" : "310"},
	]
	"Casey" : [
 		{ "sections_uuid": "3", "sections_instructor": "Casey", "sections_avg": 95, "sections_title" : "310"},

		{ "sections_uuid": "4", "sections_instructor": "Casey", "sections_avg": 85, "sections_title" : "310"}
	]
},
"210" : [

]

*/

	private async applyRulesRecursive(
		groupedResults: Record<string, any> | Object[],
		applyRules: Record<string, [string, string]>,
		groupKeyIterator: number,
		keyList: string[]
	): Promise<Object[]> {
		let results: Object[] = [];
		if (groupKeyIterator === this.groupKeys.length) {
			const SORArr: Object[] = groupedResults as Object[];
			const group = this.makeNewObject(SORArr, keyList, applyRules);
			results.push(group);
		} else {
			const resultsPromises: Promise<Object[]>[] = [];
			for (const currkey of Object.keys(groupedResults)) {
				const newKeyList = keyList.concat(currkey);
				resultsPromises.push(
					this.applyRulesRecursive(
						(groupedResults as Record<string, any>)[currkey],
						applyRules,
						groupKeyIterator + 1,
						newKeyList
					)
				);
			}
			try {
				//console.log("reached promise");
				results = (await Promise.all(resultsPromises)).flat();
				//console.log(loadDatasetPromises.length);
			} catch (err) {
				throw new Error(`Failed apply rules recursively, error: ${err}`);
			}
		}
		return results;
	}

	private async makeNewObject(
		SORArr: Object[],
		keyList: string[],
		applyRules: Record<string, [string, string]>
	): Promise<Object> {
		const group: Record<string, any> = {};
		for (let i = 0; i < this.groupKeys.length; i++) {
			group[this.groupKeys[i]] = keyList[i];
		}
		for (const applyKey of Object.keys(applyRules)) {
			group[applyKey] = this.applyAFunction(applyRules[applyKey][0], applyRules[applyKey][1], SORArr);
		}
		return [Object];
	}

	private applyAFunction(token: string, targetKey: string, SORArr: Object[]): Object {
		const key = targetKey.split("_")[1];
		const targetFieldList: any[] = [];

		for (const SOR of SORArr) {
			targetFieldList.push((SOR as Record<string, any>)[key]);
		}

		if (this.checkTargetKey(targetKey) === "number") {
			if (token === "MAX") {
				return Math.max(...targetFieldList);
			} else if (token === "MIN") {
				return Math.min(...targetFieldList);
			} else if (token === "AVG") {
				const sum = targetFieldList.reduce((acc, num) => acc + num, 0);
				const avg = sum / targetFieldList.length;
				return avg;
			} else if (token === "SUM") {
				const sum = targetFieldList.reduce((acc, num) => acc + num, 0);
				return sum;
			} else if (token === "COUNT") {
				return Array.from(new Set(targetFieldList));
			} else {
				throw new InsightError("Invalid apply token");
			}
		} else {
			if (token === "COUNT") {
				return Array.from(new Set(targetFieldList));
			} else {
				throw new InsightError("Invalid apply token");
			}
		}
	}

	private checkTargetKey(targetKey: string): string {
		if (this.sectionOrRoom === "section") {
			if (targetKey in this.utils.mFieldsSection) {
				return "number";
			} else {
				return "string";
			}
		} else if (this.sectionOrRoom === "room") {
			if (targetKey in this.utils.mFieldsRoom) {
				return "number";
			} else {
				return "string";
			}
		} else {
			throw new InsightError("section or room not defined");
		}
	}

	private async checkApplyRules(apply: unknown): Promise<Record<string, [string, string]>> {
		const applyRules: Record<string, [string, string]> = {};
		const applyArr = this.utils.coerceToArray(apply);
		const validApplyKeyRegex = /[^_]+/;

		for (const rule of applyArr) {
			if (typeof rule !== "object") {
				throw new InsightError("Apply rule invalid type");
			} else {
				const ruleObj = Object(rule);
				if (Object.keys(ruleObj).length !== 1) {
					throw new InsightError("Apply rule should have only one key");
				}
				const applyKey = Object.keys(ruleObj)[0];
				const applyTokenAndKey = Object.values(ruleObj)[0];
				if (!validApplyKeyRegex.test(applyKey)) {
					throw new InsightError("Apply key cannot contain underscores");
				} else if (applyKey in applyRules) {
					throw new InsightError("Cannot have duplicate apply keys");
				}
				const TokenAndKeyPair = this.checkTokenAndKey(applyTokenAndKey);
				applyRules[applyKey] = TokenAndKeyPair;
			}
		}
		return applyRules;
	}

	private checkTokenAndKey(applyTokenAndKey: unknown): [string, string] {
		if (typeof applyTokenAndKey !== "object") {
			throw new InsightError("Apply key invalid type");
		} else {
			const applyTokenAndKeyObj = Object(applyTokenAndKey);
			if (Object.keys(applyTokenAndKeyObj).length !== 1) {
				throw new InsightError("applytoken should be the only key");
			}

			const token = this.checkValidToken(Object.keys(applyTokenAndKeyObj)[0]);
			const key = Object.values(applyTokenAndKeyObj)[0];

			if (typeof key !== "string") {
				throw new InsightError("APPLY invalid target key type");
			}
			if (this.checkValidKey(String(key))) {
				return [token, String(key)];
			} else {
				throw new InsightError("APPLY invalid target key");
			}
		}
	}

	private checkValidToken(token: unknown): string {
		if (typeof token !== "string") {
			throw new InsightError("APPLY invalid applytoken type");
		} else {
			const tokenStr = String(token);
			if (tokenStr in this.utils.validApplyTokens) {
				return tokenStr;
			} else {
				throw new InsightError("APPLY invalid applytoken");
			}
		}
	}
}
