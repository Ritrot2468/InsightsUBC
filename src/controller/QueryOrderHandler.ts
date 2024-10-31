import { InsightError } from "./IInsightFacade";
import QueryUtils from "./QueryUtils";

export class QueryOrderHandler {
	// returns the order key as a string (WORKING)
	private validSort: string[] = ["dir", "keys"];
	private validDir: string[] = ["UP", "DOWN"];
	private utils = new QueryUtils();
	private dir = "";

	public getDir(): string {
		return this.dir;
	}

	public async handleORDER(value: unknown, columns: string[]): Promise<string[]> {
		let orderKeys: string[] = [];
		this.dir = "UP";

		// if only one order key
		if (typeof value === "string") {
			//console.log(value);
			//console.log("order as a string");
			const valueStr = String(value);
			orderKeys.push(this.checkKeyInColumns(valueStr, columns));
		} else if (typeof value === "object") {
			//console.log("order as an object");
			//console.log(value);
			const sortObj = Object(value);
			const sortKeys = Object.keys(sortObj);
			const invalidKeys = sortKeys.filter((key) => !this.validSort.includes(key));

			//console.log(sortKeys);
			if (invalidKeys.length > 0) {
				throw new InsightError("Invalid keys in ORDER");
			}

			if ("dir" in sortObj) {
				//console.log(typeof sortObj.dir);
				//console.log("reached dir in sorKeys");
				//console.log(sortObj.dir);
				// changed from sortObj.dir in this.validDir
				if (this.validDir.includes(sortObj.dir)) {
					//console.log("WORKING");
					this.dir = sortObj.dir;
				} else {
					//console.log("Test");
					//console.log(sortObj.dir);
					throw new InsightError("Invalid 'dir' value");
				}
			} else {
				throw new InsightError("ORDER missing 'dir' key");
			}

			if ("keys" in sortObj) {
				orderKeys = await this.handleOrderKeys(sortObj.keys, columns);
			} else {
				throw new InsightError("ORDER missing 'keys' key");
			}
		} else {
			throw new InsightError("Invalid ORDER type");
		}
		return orderKeys;
	}

	private async handleOrderKeys(value: unknown, columns: string[]): Promise<string[]> {
		const orderKeys: string[] = [];
		if (this.utils.isStringArray(value)) {
			const keys = value as string[];
			if (keys.length === 0) {
				throw new InsightError("ORDER keys must be a non-empty array");
			}
			for (const key of keys) {
				orderKeys.push(this.checkKeyInColumns(key, columns));
			}
		} else {
			throw new InsightError("ORDER keys must be an array of strings");
		}
		return orderKeys;
	}

	// checks if the key is in columns, if not, throw error
	private checkKeyInColumns(key: string, columns: string[]): string {
		if (columns.includes(key)) {
			return key;
		} else {
			throw new InsightError("ORDER key must be in COLUMNS");
		}
	}
}
