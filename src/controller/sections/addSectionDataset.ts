import DatasetValidatorHelper from "../DatasetValidatorHelper";
import SectionDiskReader from "./SectionDiskReader";
import SectionDiskWriter from "./SectionDiskWriter";
import fs from "fs-extra";
import Section from "./Section";
import { InsightDatasetKind, InsightError } from "../IInsightFacade";

export default class AddSectionDataset {
	private sv: DatasetValidatorHelper;
	private secDiskReader: SectionDiskReader;
	private secDiskWriter: SectionDiskWriter;

	constructor() {
		this.sv = new DatasetValidatorHelper();
		this.secDiskReader = new SectionDiskReader();
		this.secDiskWriter = new SectionDiskWriter();
	}

	public async addCourses(
		id: string,
		sectionsDatabase: Map<string, Section[]>,
		content: string,
		kind: InsightDatasetKind
	): Promise<string[]> {
		try {
			await this.sv.validateIdStructure(id);
			await this.secDiskWriter.logSectionsDatasetOnDisk(content, id);
			await this.secDiskReader.logNewDatasetFromDiskToMap(id, sectionsDatabase);
			await this.secDiskWriter.logInsightKindToDisk(id, kind, sectionsDatabase.get(id)?.length as number);

			return fs.readdir("./data");
		} catch (err) {
			if (err instanceof InsightError) {
				throw err;
			}
			throw new InsightError(`An unexpected error occurred: ${err}`);
		}
	}
}
