import { InsightError } from "./IInsightFacade";
import QueryUtils from "./QueryUtils";

export class QueryOrderHandler {
	// returns the order key as a string (WORKING)
	private validSort: string[] = ["dir", "keys"];
	private validDir: string[] = ["UP", "DOWN"];
	private utils = new QueryUtils();
	public dir = "";

	public async handleORDER(value: unknown, columns: string[]): Promise<string[]> {
		let orderKeys: string[] = [];

		// if only one order key
		if (typeof value === "string") {
			const valueStr = String(value);
			orderKeys.push(this.checkKeyInColumns(valueStr, columns));
		} else if (typeof value === "object") {
			const sortObj = Object(value);
			const sortKeys = Object.keys(sortObj);
			const invalidKeys = sortKeys.filter((key) => !this.validSort.includes(key));

			if (invalidKeys.length > 0) {
				throw new InsightError("Invalid keys in ORDER");
			}

			if ("dir" in sortObj) {
				if ("dir" in this.validDir) {
					this.dir = sortObj.dir;
				} else {
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
