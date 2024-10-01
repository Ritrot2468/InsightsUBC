import {InsightError} from "./IInsightFacade";

export default class SectionsValidator {
	public validateId(id: string, ids: string[]): void {
		// Validate ID follows proper format
		if (id.includes("_") || id.trim().length === 0) {
			throw new InsightError("Invalid ID structure");
		}

		// Check if ID already exists
		if (ids.includes(id)) {
			throw new InsightError("Dataset already in our record");
		}

		// Validate content based on its kind
		const base64Regex = /^[^_]+$/;
		if (!base64Regex.test(id)) {
			throw new InsightError("Invalid id");
		}
	}
}
