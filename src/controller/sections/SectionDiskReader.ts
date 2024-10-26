import { InsightDataset, InsightDatasetKind, InsightError } from "../IInsightFacade";
import SectionsParser, { DatasetRecord } from "./SectionsParser";
import fs from "fs-extra";
import Section from "./Section";

// Any information about Sections that need to read from the disk

export default class SectionDiskReader extends SectionsParser {
	constructor() {
		super();
	}

	// REQUIRES: currIDs - array of all the dataset ids currently added in InsightFacade instance
	//			 sectionsDatabase - map of all added datasets and their associated sections
	// EFFECTS: finds all sections datasets in disks not in current datasets and returns a map of the datasets with their id (dataset name)
	// and associated sections
	// datasetsIds = all currently added datasets (refer to currIDs),
	public async mapMissingSections(
		currIDs: string[],
		sectionsDatabase: Map<string, Section[]>
	): Promise<Map<string, Section[]>> {
		const allPromises: Promise<DatasetRecord>[] = [];
		// the id of all datasets not currently added

		currIDs.forEach((setId) => {
			// all ids for missing datasets are returned as a Record
			// with all the sections associated with the id
			const promise = this.turnDatasetToSection(setId);
			allPromises.push(promise);
		});

		const records = await Promise.all(allPromises);
		// add all records collected to Map
		records.forEach((record) => {
			sectionsDatabase.set(record.id, record.sections);
		});

		return sectionsDatabase;
	}

	// Writes InsightDataset info about a dataset from disk
	public async logInsightKindFromDisk(ids: string[]): Promise<InsightDataset[]> {
		const allPromises = ids.map(async (id) => {
			const file = await fs.promises.readFile(`./data/${id}/kind`, "utf8");
			const obj = JSON.parse(file);

			const numRows = obj.table[0].numRows as number;
			const kind = obj.table[0].kind as InsightDatasetKind;

			const newInsightDataset: InsightDataset = {
				id: id,
				kind: kind,
				numRows: numRows,
			};

			return newInsightDataset;
		});

		const result = await Promise.all(allPromises);
		return result;
	}

	// REQUIRES: id - name of dataset to be retrieved from disk (id IS NOT IN datasets ALREADY!!!!)
	//           datasets - sets you'll be mapping new DatasetRecord to
	// EFFECTS: Retrieves the sections associated with the dataset id on disk and turned into Sections objects and maps
	//          them to sectionsDatabase with their associated id.
	// OUTPUT: VOID
	public async logNewDatasetFromDiskToMap(id: string, sectionsDatabase: Map<string, Section[]>): Promise<void> {
		const newDataset = await this.turnDatasetToSection(id);
		const numRows = newDataset.sections.length;

		if (numRows === 0) {
			throw new InsightError("No valid Section");
		}
		// update member variables
		sectionsDatabase.set(newDataset.id, newDataset.sections);
	}
}
