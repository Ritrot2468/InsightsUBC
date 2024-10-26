import { InsightError } from "./IInsightFacade";
import fs from "fs-extra";
import Section from "./sections/Section";

export default class DatasetValidatorHelper {
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

	public async validateSectionAddition(id: string, sectionsDatabase: Map<string, Section[]>): Promise<void> {
		if (sectionsDatabase.has(id) || (await fs.pathExists(`./data/${id}`))) {
			throw new InsightError(`Dataset with id ${id} already exists.`);
		}
	}
}
