import { InsightError } from "./IInsightFacade";

export default class SectionsValidator {
	// checks if a dataset id is valid to be added

	// checks if a dataset id is valid to be removed
	public async validateIdStructure(id: string): Promise<void> {
		// Validate ID follows proper format

		if (id.includes("_") || id.trim().length === 0) {
			throw new InsightError("Invalid ID structure");
		}

		// Validate content based on its kind
		const base64Regex = /^[^_]+$/;
		if (!base64Regex.test(id)) {
			throw new InsightError("Invalid id");
		}
	}

	// async checkPathAndValidateID(id: string): Promise<void> {
	// 	try {
	// 		const pathExists = await fs.pathExists("./data");
	// 		if (pathExists) {
	// 			const currIDs = await fs.readdir("./data");
	// 			this.validateId(id, currIDs);
	// 		} else {
	// 			this.validateId(id, []);
	// 		}
	// 	} catch (err) {
	// 		throw err;
	// 	}
	// }
}
