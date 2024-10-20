
import JSZip from "jszip";
import RoomsParser from "./RoomsParser";

export default class RoomDiskWriter extends RoomsParser {
	// Every SectionDiskWriter needs to be able to parse sections using SectionsParser

	constructor() {
		super();
	}

	public async logRoomsDatasetOnDisk(content: string, id: string): Promise<void> {
		const buffer = Buffer.from(content, "base64");
		const zip = await JSZip.loadAsync(buffer);
		await this.logRoomDataset(zip, id);
	}

	private async logRoomDataset(zip: JSZip, id: string): Promise<void> {
		const allPromises = [];

		for (const key in zip.files) {
			const name = key;

			if (name.match(/^courses\/\w/) && name.match(/^[^.]+$/)) {
				const promiseContent = zip.files[key].async("string").then(async (content0) => {
					const indexHtml = await zip.file('index.htm')!.async('string');
					console.log(indexHtml);
					const indexDoc = new DOMParser().parseFromString(indexHtml, 'text/html');
				});

				allPromises.push(promiseContent);
			}
		}

		const courseDataList = await Promise.all(allPromises);
	}

}
