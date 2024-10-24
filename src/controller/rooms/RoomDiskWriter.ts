//import JSZip from "jszip";
import RoomsParser from "./RoomsParser";
// import * as parse5 from "parse5";
// import { InsightError } from "../IInsightFacade";
// import Building from "./Building";

export default class RoomDiskWriter extends RoomsParser {
	// Every SectionDiskWriter needs to be able to parse sections using SectionsParser
	// constructor() {
	// 	super();
	// }
	//
	// public async logRoomsDatasetOnDisk(content: string, id: string): Promise<void> {
	// 	const buffer = Buffer.from(content, "base64");
	// 	const zip = await JSZip.loadAsync(buffer);
	// 	await this.logRoomDataset(zip, id);
	// }
	//
	// // writes room dataset info onto disk
	// private async logRoomDataset(zip: JSZip, id: string): Promise<void> {
	// 	let buildingMap: Map<string, Building> = new Map<string, Building>();
	// 	const allPromises = [];
	// 	buildingMap = await this.parseIndexFile(zip);
	// 	//roomMap = await this.parseRoomFile(zip);
	// }
	//
	// public async parseIndexFile(zip: JSZip): Promise<Map<string, Building>> {
	// 	const allPromises: Promise<Map<string, Building>>[] = [];
	//
	// 	for (const key in zip.files) {
	// 		if (key === "campus/index.htm") {
	// 			const promiseContent = zip.files[key].async("string").then((content0) => {
	// 				const document = parse5.parse(content0);
	// 				const buildingTdClassNames: string[] = [];
	// 				return this.findTdElemsWithClassName(document, buildingTdClassNames);
	// 			});
	// 			allPromises.push(promiseContent);
	// 		}
	// 	}
	//
	// 	// wait for all promises
	// 	const results = await Promise.all(allPromises);
	// 	const combinedMap = new Map<string, Building>();
	//
	// 	// combine all maps
	// 	results.forEach((buildingMap) => {
	// 		buildingMap.forEach((building, shortname) => {
	// 			combinedMap.set(shortname, building);
	// 		});
	// 	});
	//
	// 	return combinedMap;
	// }
	//
	// private findTdElemsWithClassName(doc: any, classNames: string[]): Map<string, Building> {
	// 	const buildingsMap = new Map<string, Building>();
	// 	// Function to traverse the parsed tree
	// 	const traverse = (node: any) => {
	// 		// Check if the current node is a <tr> element
	// 		const currClassNames: string[] = [];
	// 		if (node.nodeName === "tr" && node.childNodes) {
	// 			// Gather all <td> elements within this <tr>
	// 			const tdElems = node.childNodes.filter((child: any) => child.nodeName === "td");
	// 			//console.log(tdElems)
	//
	// 			// Process each <td> element
	// 			tdElems.forEach((tdElem: any) => {
	// 				const classAttr = tdElem.attrs.find((attr: any) => attr.name === "class");
	// 				//console.log(classAttr)
	// 				const classList = classAttr ? classAttr.value : "";
	// 				if (classList != "") {
	// 					currClassNames.push(classList);
	// 				}
	// 			});
	//
	// 			if (classNames.length === 0) {
	// 				classNames = currClassNames;
	// 			} else {
	// 				//console.log("classNames: ", classNames)
	// 				//console.log("currClassNames: ", currClassNames)
	// 				if (this.compareClassNames(classNames, currClassNames)) {
	// 					const newBuilding: Building = this.parseBuildingInfo(tdElems, classNames);
	// 					buildingsMap.set(newBuilding.getShortname(), newBuilding);
	// 					//console.log(newBuilding.getShortname())
	// 				}
	// 			}
	// 		}
	//
	// 		// Recursively traverse child nodes
	// 		if (node.childNodes) {
	// 			node.childNodes.forEach((child: any) => traverse(child));
	// 		}
	// 	};
	//
	// 	traverse(doc); // Start traversing from the root document
	//
	// 	//console.log(buildingsMap.size)
	//
	// 	if (buildingsMap.size === 0) {
	// 		throw new InsightError("No <td> elements found or valid buildings detected.");
	// 	}
	//
	// 	return buildingsMap;
	// }
	//
	// private compareClassNames(arr1: any[], arr2: any[]): boolean {
	// 	return arr1.length === arr2.length && arr1.every((value) => arr2.includes(value));
	// }
	//
	// private parseBuildingInfo(tdElems: any, classList: string[]): Building {
	// 	// Extract the anchor element within the <td>
	// 	//console.log(tdElems[0].attr)
	// 	let fullname = "";
	// 	let shortname = "";
	// 	let address = "";
	// 	let href = "";
	//
	// 	tdElems.forEach((tdElem: any) => {
	// 		const classAttr = tdElem.attrs.find((attr: any) => attr.name === "class");
	// 		const className = classAttr ? classAttr.value : "";
	//
	// 		if (className === "views-field views-field-field-building-image") {
	// 			return; // SKIP
	// 		}
	// 		const anchor = tdElem.childNodes.find((node: any) => node.nodeName === "a");
	// 		//console.log(anchor)
	// 		//console.log(className)
	// 		switch (className) {
	// 			case "views-field views-field-field-building-code":
	// 				shortname = tdElem.childNodes
	// 					.map((node: any) => node.value)
	// 					.join("")
	// 					.trim();
	// 				//console.log(shortname)
	// 				break;
	// 			case "views-field views-field-title":
	// 				fullname = anchor.childNodes
	// 					.map((node: any) => node.value)
	// 					.join("")
	// 					.trim();
	// 				//console.log(fullname)
	// 				break;
	// 			case "views-field views-field-field-building-address":
	// 				address = tdElem.childNodes
	// 					.map((node: any) => node.value)
	// 					.join("")
	// 					.trim();
	//
	// 				//console.log(address)
	// 				break;
	// 			case "views-field views-field-nothing":
	// 				href = anchor.attrs.find((attr: any) => attr.name === "href")?.value || "";
	// 				//console.log(href)
	// 				break;
	// 			default:
	// 				throw new InsightError("Not a valid building table cell");
	// 		}
	// 	});
	//
	// 	// Create and return a new Building instance
	// 	return new Building({ fullname, shortname, address, href });
	// }
}
