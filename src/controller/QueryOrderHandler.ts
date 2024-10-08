import { InsightError } from "./IInsightFacade";

export class QueryOrderHandler {
	// returns the order key as a string (WORKING)
	public async handleORDER(value: unknown, columns: string[]): Promise<string> {
		const valueStr = String(value);
		if (columns.includes(valueStr)) {
			return valueStr;
		} else {
			throw new InsightError("ORDER key must be in COLUMNS");
		}
	}
}
