import Section from "./IInsightFacade";
import fs from "fs-extra";
import SectionsParser from "./SectionsParser";

export interface DatasetRecord {
    id: string,
    sections: Section[]
}

export default class DiskReader{
    private sp: SectionsParser;

    constructor() {
        this.sp = new SectionsParser()
    }
    // returns list of ids of datasets written to disk not found in currently added datasets
    public async findDatasetsNotAdded(currDatasets: string[]): Promise<string[]> {
        const missingData : string[] = []
        const allDataset = await fs.readdir('./data/')
        allDataset.map((dataset) => {
            //console.log(dataset)
            if (!currDatasets.includes(dataset)) {
                missingData.push(dataset)
            }
        })
        //console.log(missingData)
        return missingData
    }

    // finds all datasets in disks not in current datasets and returns a map of the datasets with their id (dataset name)
    // and associated sections
    // datasetsIds = all currently added datasets (refer to currIDs),
    public async mapMissingSections(datasetIds: string[]) : Promise<Map<string, Section[]>> {
        const missingDatasets  = new Map<string, Section[]>();
        const allPromises : Promise<DatasetRecord>[] = [];
        // the id of all datasets not currently added
        const missingDatasetsID = await this.findDatasetsNotAdded(datasetIds);

        missingDatasetsID.forEach((setId) => {
            // all ids for missing datasets are returned as a Record
            // with all the sections associated with the id
            const promise = this.sp.turnDatasetToSection(setId)
            allPromises.push(promise)
        })
        const records = await Promise.all(allPromises)

        // add all records collected to Map
        records.forEach((record) => {

            missingDatasets.set(record.id, record.sections)
        })
        return missingDatasets
    }



}
