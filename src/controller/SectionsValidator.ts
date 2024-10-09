import { InsightError, NotFoundError } from "./IInsightFacade";
import fs from "fs-extra";

export default class SectionsValidator {
	// checks if a dataset id is valid to be added
	public async validateId(id: string): Promise<void> {
		// Validate ID follows proper format
		if (id.includes("_") || id.trim().length === 0) {
			throw new InsightError("Invalid ID structure");
		}

		// Validate content based on its kind
		const base64Regex = /^[^_]+$/;
		if (!base64Regex.test(id)) {
			throw new InsightError("Invalid id");
		}

		const bool = await fs.pathExists("./data");
		if (bool) {
			const ids = await fs.readdir("./data");
			// Check if ID already exists
			if (ids.includes(id)) {
				throw new InsightError("Dataset already in our record");
			}
		}
	}

	// checks if a dataset id is valid to be removed
	public async validateIdRemoval(id: string): Promise<void> {
		// Validate ID follows proper format

		if (id.includes("_") || id.trim().length === 0) {
			throw new InsightError("Invalid ID structure");
		}

		// Validate content based on its kind
		const base64Regex = /^[^_]+$/;
		if (!base64Regex.test(id)) {
			throw new InsightError("Invalid id");
		}

		const bool = await fs.pathExists("./data");
		if (bool) {
			const ids = await fs.readdir("./data");
			// Check if ID already exists
			if (!ids.includes(id)) {
				throw new NotFoundError("Dataset not found");
			}
		} else {
			throw new NotFoundError("Empty Dataset");
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
