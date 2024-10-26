import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import {clearDisk, getContentFromArchives, loadTestQuery} from "../TestUtil";

import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let rooms: string;

	describe("AddDataset - Sections", function () {

		let sections2: string;
		let empty: string;
		let defectiveSet: string;
		let defectiveSet1: string;
		let emptyCourse: string;
		let noJson: string;

		beforeEach(async function () {
			// This section resets the insightFacade instance
			// This runs before each test
			await clearDisk();
			facade = new InsightFacade();
		});
		before(async function () {
			// This block runs once and loads the datasets.
			sections = await getContentFromArchives("sections/test1.zip");
			sections2 = await getContentFromArchives("sections/test3.zip");
			empty = await getContentFromArchives("sections/empty-zip.zip");
			defectiveSet = await getContentFromArchives("sections/all_invalid_sections_in_one_course.zip");
			defectiveSet1 = await getContentFromArchives("sections/no_valid_sections.zip");
			emptyCourse = await getContentFromArchives("sections/empty_file.zip");
			noJson = await getContentFromArchives("sections/no_json.zip");
		});

		it("should reject with an empty dataset id", async function () {
			await expect(facade.addDataset("", sections, InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError);
		});

		it("should reject with an empty file in zip", async function () {
			await expect(facade.addDataset("section", emptyCourse, InsightDatasetKind.Sections)).to.be.rejectedWith(
				InsightError
			);
		});

		it("non JSON formatted file in zip", async function () {
			await expect(facade.addDataset("sections", noJson, InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError);
		});

		it("should reject with an underscore1", async function () {
			await expect(facade.addDataset("red_", sections, InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError);
		});

		it("should reject with an underscore2", async function () {
			await expect(facade.addDataset("_1_", sections, InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError);
		});

		it("should reject repeat adds with same id and diff sets", async function () {
			await expect(facade.addDataset("section", sections, InsightDatasetKind.Sections)).to.eventually.have.members([
				"section",
			]);
			await expect(facade.addDataset("section", sections2, InsightDatasetKind.Sections)).to.eventually.be.rejectedWith(
				InsightError
			);
		});

		it("should reject repeat adds with same id cross different facades", async function () {
			await expect(facade.addDataset("section", sections, InsightDatasetKind.Sections)).to.eventually.have.members([
				"section",
			]);

			const facade2: InsightFacade = new InsightFacade();
			await expect(facade2.addDataset("section", sections2, InsightDatasetKind.Sections)).to.eventually.be.rejectedWith(
				InsightError
			);
		});

		it("should reject repeat adds with same id and same sets", async function () {
			await expect(facade.addDataset("section", sections, InsightDatasetKind.Sections)).to.eventually.have.members([
				"section",
			]);
			await expect(facade.addDataset("section", sections, InsightDatasetKind.Sections)).to.eventually.be.rejectedWith(
				InsightError
			);
		});

		it("invalid (defective dataset)", async function () {
			await expect(
				facade.addDataset("courses", defectiveSet1, InsightDatasetKind.Sections)
			).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with empty space", async function () {
			// const result = await ;
			await expect(facade.addDataset("  ", sections, InsightDatasetKind.Sections)).to.be.eventually.be.rejectedWith(
				InsightError
			);
		});

		it("should add valid data properly", async function () {

			const result = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			return expect(result).to.have.members(["sections"]);
		});

		it("should add valid data properly (valid id - one char)", async function () {
			const result = await facade.addDataset("s", sections, InsightDatasetKind.Sections);

			return expect(result).to.have.members(["s"]);
		});

		it("should add valid data properly (valid id - space between)", async function () {
			const result = await facade.addDataset(" s ", sections, InsightDatasetKind.Sections);

			return expect(result).to.have.members([" s "]);
		});

		// test content data
		it("should add valid data properly (invalid content not 64 - space between)", async function () {
			await expect(facade.addDataset("sections", "/5", InsightDatasetKind.Sections)).to.eventually.be.rejectedWith(
				InsightError
			);
		});

		it("should reject with an empty zip file", async function () {
			await expect(facade.addDataset("sections", empty, InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError);
		});

		it("should reject with an empty file", async function () {
			await expect(facade.addDataset("sections", "", InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError);
		});

		it("one course with all invalid sections - contains valid sections", async function () {
			try {
				const result1 = await facade.addDataset("section", defectiveSet, InsightDatasetKind.Sections);
				expect(result1.length).to.equal(1);
				expect(result1).to.include.members(["section"]);
			} catch (err) {
				expect.fail(`Not valid entry: ${err}`);
			}
		});

		it("successful multiple adds - diff datasets", async function () {
			try {
				const result1 = await facade.addDataset("section", sections, InsightDatasetKind.Sections);
				expect(result1.length).to.equal(1);
				expect(result1).to.include.members(["section"]);

				const result2 = await facade.addDataset("courses", sections2, InsightDatasetKind.Sections);
				const EXPECTED_LENGTH = 2;
				expect(result2.length).to.equal(EXPECTED_LENGTH);
				expect(result2).to.include.members(["section", "courses"]);
			} catch (err) {
				//expect.fail(`Not valid entry: ${err.message}`);
				expect.fail(`Error processing entry: ${err}`);
			}
		});

		it("reject multiple adds with same datasets and diff id", async function () {
			try {
				const result1 = await facade.addDataset("section", sections, InsightDatasetKind.Sections);
				expect(result1.length).to.equal(1);
				expect(result1).to.include.members(["section"]);

				const result2 = await facade.addDataset("courses", sections2, InsightDatasetKind.Sections);
				const EXPPECTED_LENGTH = 2;
				expect(result2.length).to.equal(EXPPECTED_LENGTH);
				expect(result2).to.include.members(["section", "courses"]);
			} catch (err) {
				expect.fail(`Not valid entry: ${err}`);
			}
		});

		it("list 2 datasets from different facades", async function () {
			try {
				sections = await getContentFromArchives("sections/test3.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Sections);
				const datasets = await facade.listDatasets();
				expect(datasets).to.deep.equal([
					{
						id: "test3",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
				]);

				const facade2: InsightFacade = new InsightFacade();
				let datasets2 = await facade2.listDatasets();
				expect(datasets2).to.deep.equal(datasets);

				const sections1 = await getContentFromArchives("sections/test5.zip");
				await facade2.addDataset("test5", sections1, InsightDatasetKind.Sections);

				datasets2 = await facade2.listDatasets();
				const EXPECTED_LENGTH = 2;
				expect(datasets2.length).to.equal(EXPECTED_LENGTH);
				expect(datasets2).to.include.deep.members([
					{
						id: "test3",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
					{
						id: "test5",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
				]);
			} catch (err) {
				expect.fail(`you failed to load the right sets ${err}`);
			}
		});

	});

	describe("AddDataset - Rooms", function () {
		let rooms1: string;
		let rooms2: string;
		let noValidRooms1: string;
		let noValidRooms2: string;
		let noValidRooms3: string;
		let missingFields1: string;
		let missingFields2: string;

		beforeEach(async function () {
			// This section resets the insightFacade instance
			// This runs before each test
			await clearDisk();
			facade = new InsightFacade();
		});
		before(async function () {
			// This block runs once and loads the datasets.
			sections = await getContentFromArchives("sections/test1.zip");

			//emptyCourse = await getContentFromArchives("sections/empty_file.zip");
			rooms1 = await getContentFromArchives("rooms/test1.zip");
			rooms2 = await getContentFromArchives("rooms/test2.zip");
			noValidRooms1 = await getContentFromArchives("rooms/no_valid_rooms.zip");
			noValidRooms2 = await getContentFromArchives("rooms/no_valid_table1.zip");
			noValidRooms3 = await getContentFromArchives("rooms/no_valid_rooms3.zip");
			missingFields1 = await getContentFromArchives("rooms/missing_fields.zip");
			missingFields2 = await getContentFromArchives("rooms/missing_fields2.zip");
		});

		it("should reject with an empty dataset id - rooms", async function () {
			await expect(facade.addDataset("", rooms1, InsightDatasetKind.Rooms)).to.be.rejectedWith(InsightError);
		});
		it("should reject with no valid table -> no rooms - rooms", async function () {
			await expect(facade.addDataset("room2", noValidRooms2, InsightDatasetKind.Rooms)).to.be.rejectedWith(InsightError);
		});
		it("course not in index file -> no rooms - rooms", async function () {
			await expect(facade.addDataset("room3", noValidRooms3, InsightDatasetKind.Rooms)).to.be.rejectedWith(InsightError);
		});
		it("course not in index file -> valid rooms - rooms", async function () {
			const result = await facade.addDataset("room3", rooms2, InsightDatasetKind.Rooms)
			return expect(result).to.have.members(["room3"]);
		});
		it("building field not in index file -> valid rooms - rooms", async function () {
			const result = await facade.addDataset("room4", missingFields2, InsightDatasetKind.Rooms)
			return expect(result).to.have.members(["room4"]);
		});
		//
		// it("should reject with an empty file in zip - rooms", async function () {
		// 	await expect(facade.addDataset("section", emptyCourse, InsightDatasetKind.Sections)).to.be.rejectedWith(
		// 		InsightError
		// 	);
		// });
		//
		// it("non JSON formatted file in zip - rooms", async function () {
		// 	await expect(facade.addDataset("sections", noJson, InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError);
		// });

		it("invalid id underscore - rooms", async function() {
			await expect(facade.addDataset("red_", rooms1, InsightDatasetKind.Rooms)).to.be.rejectedWith(InsightError)
		});

		it("invalid rooms- duplicate datasets id", async function() {
			await facade.addDataset("red", rooms1, InsightDatasetKind.Rooms);
			await expect(facade.addDataset("red", rooms1, InsightDatasetKind.Rooms)).to.be.rejectedWith(InsightError)
		});

		// it("invalid rooms entry with Sections kind", async function() {
		// 	await expect(facade.addDataset("red", rooms1, InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError)
		// });

		it("invalid rooms entry with Sections content", async function() {
			await expect(facade.addDataset("red", sections, InsightDatasetKind.Rooms)).to.be.rejectedWith(InsightError)
		});

		it("add a room Dataset properly - room", async function() {
			const result = await facade.addDataset("room1", rooms1, InsightDatasetKind.Rooms);
			return expect(result).to.have.members(["room1"]);
		});

		it("no valid rooms- room", async function() {
			 await expect(facade.addDataset("room2", noValidRooms1, InsightDatasetKind.Rooms)).to.be.rejectedWith(InsightError);

		});
		it("should reject with an underscore1 - rooms", async function () {
			// const result = await facade.addDataset(
			// 	"red_",
			// 	sections,
			// 	InsightDatasetKind.Sections
			// )
			// return expect(result).to.eventually.be.rejectedWith(InsightError);
			await expect(facade.addDataset("red_", rooms1, InsightDatasetKind.Rooms)).to.be.rejectedWith(InsightError);
		});

		it("should reject with an underscore2 - rooms", async function () {
			// const result = facade.addDataset(
			// 	"_1_",
			// 	sections,
			// 	InsightDatasetKind.Sections
			// );
			// return expect(result).to.eventually.be.rejectedWith(InsightError);
			await expect(facade.addDataset("_1_", rooms1, InsightDatasetKind.Rooms)).to.be.rejectedWith(InsightError);
		});

		// it("should reject repeat adds with same id and diff sets - rooms", async function () {
		// 	await expect(facade.addDataset("section", sections, InsightDatasetKind.Sections)).to.eventually.have.members([
		// 		"section",
		// 	]);
		// 	await expect(facade.addDataset("section", sections2, InsightDatasetKind.Sections)).to.eventually.be.rejectedWith(
		// 		InsightError
		// 	);
		// });

		it("should reject repeat adds with same id cross different facades - rooms", async function () {
			await expect(facade.addDataset("section", rooms1, InsightDatasetKind.Rooms)).to.eventually.have.members([
				"section",
			]);

			const facade2: InsightFacade = new InsightFacade();
			await expect(facade2.addDataset("section", rooms1, InsightDatasetKind.Rooms)).to.eventually.be.rejectedWith(
				InsightError
			);
		});

		it("should reject repeat adds with same id and same sets - rooms", async function () {
			await expect(facade.addDataset("section", rooms1, InsightDatasetKind.Rooms)).to.eventually.have.members([
				"section",
			]);
			await expect(facade.addDataset("section", rooms1, InsightDatasetKind.Rooms)).to.eventually.be.rejectedWith(
				InsightError
			);
		});
		//
		it("invalid (defective dataset) - rooms", async function () {
			await expect(
				facade.addDataset("courses", "232/DTETGTE", InsightDatasetKind.Rooms)
			).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with empty space - rooms", async function () {
			// const result = await ;
			await expect(facade.addDataset("  ", rooms1, InsightDatasetKind.Rooms)).to.be.eventually.be.rejectedWith(
				InsightError
			);
		});


		it("should add valid data properly (valid id - one char) - rooms", async function () {
			// const result = await
			// const facade2 = new InsightFacade()
			// await facade2.addDataset("tanny", sections2, InsightDatasetKind.Sections)
			const result = await facade.addDataset("s", rooms1, InsightDatasetKind.Rooms);

			return expect(result).to.have.members(["s"]);
		});

		it("should add valid data properly (valid id - space between) - rooms", async function () {
			const result = await facade.addDataset(" s ", rooms1, InsightDatasetKind.Rooms);

			return expect(result).to.have.members([" s "]);
		});

		it("should add valid data properly (some rooms missing fields) - rooms", async function () {
			const result = await facade.addDataset("missingFields", missingFields1, InsightDatasetKind.Rooms);

			return expect(result).to.have.members(["missingFields"]);
		});

		// test content data
		it("should add valid data properly (invalid content not 64 - space between) - rooms", async function () {
			// const result = await

			//return expect(result).to.eventually.have.members(["sections"]);
			await expect(facade.addDataset("sections", "/5", InsightDatasetKind.Rooms)).to.eventually.be.rejectedWith(
				InsightError
			);
		});

		// it("should reject with an empty zip file", async function () {
		// 	await expect(facade.addDataset("sections", empty, InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError);
		// });
		//
		// it("should reject with an empty file", async function () {
		// 	await expect(facade.addDataset("sections", "", InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError);
		// });
		//
		// it("one course with all invalid sections - contains valid sections", async function () {
		// 	try {
		// 		const result1 = await facade.addDataset("section", defectiveSet, InsightDatasetKind.Sections);
		// 		expect(result1.length).to.equal(1);
		// 		expect(result1).to.include.members(["section"]);
		// 	} catch (err) {
		// 		expect.fail(`Not valid entry: ${err}`);
		// 	}
		// });
		//

		it("list 2 datasets from different facades - room", async function () {
			try {
				sections = await getContentFromArchives("sections/test3.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Sections);
				const datasets = await facade.listDatasets();
				expect(datasets).to.deep.equal([
					{
						id: "test3",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
				]);

				const facade2: InsightFacade = new InsightFacade();
				let datasets2 = await facade2.listDatasets();
				expect(datasets2).to.deep.equal(datasets);

				const sections1 = await getContentFromArchives("rooms/test2.zip");
				await facade2.addDataset("test2", sections1, InsightDatasetKind.Rooms);

				datasets2 = await facade2.listDatasets();
				const EXPECTED_LENGTH = 2;
				expect(datasets2.length).to.equal(EXPECTED_LENGTH);
				expect(datasets2).to.include.deep.members([
					{
						id: "test3",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
					{
						id: "test2",
						kind: InsightDatasetKind.Rooms,
						numRows: 16,
					},
				]);
			} catch (err) {
				expect.fail(`you failed to load the right sets ${err}`);
			}
		});


	});


	// added James' tests for removeDataset (async tests with try catch)
	describe("RemoveDataset - Room", function () {
		beforeEach(async function () {
			//  This section resets the insightFacade instance;
			// This runs before each test
			await clearDisk();
			facade = new InsightFacade();
			rooms = await getContentFromArchives("rooms/test2.zip");
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject remove with empty dataset id", async function () {
			await facade.addDataset("UBC", sections, InsightDatasetKind.Sections);
			try {
				await facade.removeDataset("");
				expect.fail("Error should have been thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject remove with underscore in dataset id - rooms", async function () {
			await facade.addDataset("UBC", rooms, InsightDatasetKind.Rooms);
			try {
				await facade.removeDataset("UBC_1");
				expect.fail("Error should have been thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject remove with datasets empty - room", async function () {
			try {
				await facade.removeDataset("UBC");
				expect.fail("Error should have been thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should reject remove with id not found - room", async function () {
			await facade.addDataset("UBC", rooms, InsightDatasetKind.Rooms);
			try {
				await facade.removeDataset("SFU");
				expect.fail("Error should have been thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should reject remove same dataset twice - room", async function () {
			await facade.addDataset("UBC", rooms, InsightDatasetKind.Rooms);
			try {
				let result = await facade.removeDataset("UBC");
				expect(result).to.equal("UBC");
				result = await facade.removeDataset("UBC");
				expect.fail("Error should have been thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should remove valid dataset - rooms", async function () {
			await facade.addDataset("UBC", rooms, InsightDatasetKind.Rooms);
			try {
				const result = await facade.removeDataset("UBC");
				expect(result).to.equal("UBC");
			} catch {
				expect.fail("Error should not have been thrown.");
			}
		});

		it("should remove two valid datasets - rooms", async function () {
			await facade.addDataset("UBC", rooms, InsightDatasetKind.Rooms);
			await facade.addDataset("SFU", rooms, InsightDatasetKind.Rooms);
			try {
				let result = await facade.removeDataset("UBC");
				expect(result).to.equal("UBC");
				result = await facade.removeDataset("SFU");
				expect(result).to.equal("SFU");
			} catch {
				expect.fail("Error should not have been thrown.");
			}
		});

		it("should remove the same datasets from 2 different facades - room", async function () {
			try {
				await facade.addDataset("test3", rooms, InsightDatasetKind.Rooms);
				let datasets = await facade.listDatasets();
				const EXPECTED_LENGTH_1 = 1;
				expect(datasets.length).to.equal(EXPECTED_LENGTH_1);
				expect(datasets).to.deep.equal([
					{
						id: "test3",
						kind: InsightDatasetKind.Rooms,
						numRows: 16,
					},
				]);
				const facade2: InsightFacade = new InsightFacade();

				let datasets2 = await facade2.listDatasets();
				expect(datasets2).to.deep.equal([
					{
						id: "test3",
						kind: InsightDatasetKind.Rooms,
						numRows: 16,
					},
				]);

				//expect(datasets2.length).to.be.equal(datasets.length);
				const remove1 = await facade2.removeDataset("test3");
				expect(remove1).to.be.equal("test3");

				await facade2.addDataset("test3", rooms, InsightDatasetKind.Rooms);

				const sections1 = await getContentFromArchives("rooms/missing_fields2.zip");
				await facade2.addDataset("test5", sections1, InsightDatasetKind.Rooms);

				datasets = await facade2.listDatasets();

				const facade3: InsightFacade = new InsightFacade();
				datasets2 = await facade3.listDatasets();
				const EXPECTED_LENGTH = 2;
				expect(datasets.length).to.equal(EXPECTED_LENGTH);
				//expect(datasets).to.deep.equal(datasets2);
				expect(datasets).to.include.deep.members([
					{
						id: "test3",
						kind: InsightDatasetKind.Rooms,
						numRows: 16,
					},
					{
						id: "test5",
						kind: InsightDatasetKind.Rooms,
						numRows: 2,
					},
				]);
			} catch (err) {
				expect.fail(`you failed to load the right sets ${err}`);
			}
		});
	});

	describe("RemoveDataset - Sections", function () {
		beforeEach(async function () {
			//  This section resets the insightFacade instance;
			// This runs before each test
			await clearDisk();
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject remove with empty dataset id", async function () {
			await facade.addDataset("UBC", sections, InsightDatasetKind.Sections);
			try {
				await facade.removeDataset("");
				expect.fail("Error should have been thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject remove with underscore in dataset id", async function () {
			await facade.addDataset("UBC", sections, InsightDatasetKind.Sections);
			try {
				await facade.removeDataset("UBC_1");
				expect.fail("Error should have been thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject remove with datasets empty", async function () {
			try {
				await facade.removeDataset("UBC");
				expect.fail("Error should have been thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should reject remove with id not found", async function () {
			await facade.addDataset("UBC", sections, InsightDatasetKind.Sections);
			try {
				await facade.removeDataset("SFU");
				expect.fail("Error should have been thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should reject remove same dataset twice", async function () {
			await facade.addDataset("UBC", sections, InsightDatasetKind.Sections);
			try {
				let result = await facade.removeDataset("UBC");
				expect(result).to.equal("UBC");
				result = await facade.removeDataset("UBC");
				expect.fail("Error should have been thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should remove valid dataset", async function () {
			await facade.addDataset("UBC", sections, InsightDatasetKind.Sections);
			try {
				const result = await facade.removeDataset("UBC");
				expect(result).to.equal("UBC");
			} catch {
				expect.fail("Error should not have been thrown.");
			}
		});

		it("should remove two valid datasets", async function () {
			await facade.addDataset("UBC", sections, InsightDatasetKind.Sections);
			await facade.addDataset("SFU", sections, InsightDatasetKind.Sections);
			try {
				let result = await facade.removeDataset("UBC");
				expect(result).to.equal("UBC");
				result = await facade.removeDataset("SFU");
				expect(result).to.equal("SFU");
			} catch {
				expect.fail("Error should not have been thrown.");
			}
		});

		it("should remove the same datasets from 2 different facades", async function () {
			try {
				sections = await getContentFromArchives("sections/test3.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Sections);
				let datasets = await facade.listDatasets();
				const EXPECTED_LENGTH_1 = 1;
				expect(datasets.length).to.equal(EXPECTED_LENGTH_1);
				expect(datasets).to.deep.equal([
					{
						id: "test3",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
				]);
				const facade2: InsightFacade = new InsightFacade();

				let datasets2 = await facade2.listDatasets();
				expect(datasets2).to.deep.equal([
					{
						id: "test3",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
				]);

				//expect(datasets2.length).to.be.equal(datasets.length);
				const remove1 = await facade2.removeDataset("test3");
				expect(remove1).to.be.equal("test3");

				await facade2.addDataset("test3", sections, InsightDatasetKind.Sections);

				const sections1 = await getContentFromArchives("sections/test5.zip");
				await facade2.addDataset("test5", sections1, InsightDatasetKind.Sections);

				datasets = await facade2.listDatasets();

				const facade3: InsightFacade = new InsightFacade();
				datasets2 = await facade3.listDatasets();
				const EXPECTED_LENGTH = 2;
				expect(datasets.length).to.equal(EXPECTED_LENGTH);
				//expect(datasets).to.deep.equal(datasets2);
				expect(datasets).to.include.deep.members([
					{
						id: "test3",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
					{
						id: "test5",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
				]);
			} catch (err) {
				expect.fail(`you failed to load the right sets ${err}`);
			}
		});
	});


	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */

		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[];
			try {
				result = await facade.performQuery(input);
				if (errorExpected) {
					expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
				}
				expect(result).to.includes.deep.members(expected);
				//expect(result).to.deep.equal(expected);
			} catch (err) {
				if (!errorExpected) {
					// facade.sectionsDatabase.forEach((key, value) => {
					// 	console.log(key, value)
					// })
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}

				if (expected === "InsightError") {
					expect(err).to.be.instanceOf(InsightError);
				} else if (expected === "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else {
					// If another error type is expected, fail the test
					expect.fail(`Unexpected error type: ${expected}`);
				}
			}
		}

		before(async function () {
			facade = new InsightFacade();
			//facade2 = new InsightFacade()
			sections = await getContentFromArchives("sections/pair.zip");
			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
				//console.log(loadDatasetPromises.length)
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		const sectionTestCases = [
			"[valid/simple.json] SELECT dept, avg WHERE avg > 97",
			"[valid/simple1.json] SELECT dept, uuid, avg WHERE avg > 93 AND dep = cps*",
			"[valid/simple2.json] SELECT pass, audit, dept, avg WHERE avg == 97",
			"[valid/simple3.json] SELECT dept, avg, pass, fail, audit WHERE avg > 93 AND avg > 95",
			"[valid/case_sensitive_wildcard.json] SELECT dept, uuid, avg WHERE avg > 93 AND dep = CPS*",
			"[valid/general_ast.json] SELECT dept, uuid, avg WHERE avg > 93 AND dep = *",
			"[valid/_wildcard.json] SELECT dept, uuid, avg WHERE avg > 95 AND dep = *psc",
			"[valid/_wildcard_.json] SELECT dept, uuid, avg WHERE avg > 98 AND dep = *ps*",
			"[valid/negation.json] SELECT dept, uuid, avg WHERE NOT avg > 95 AND dep = *psc",
			"[valid/gt_than_one_logic1.json] SELECT sections_dept sections_avg WHERE section_avg > 80 OR section_avg < 85",
			"[valid/complex1.json] SELECT sections_dept, sections_avg WHERE (sections_avg > 90 AND sections_avg < 100 AND sections_dept LIKE cpsc*) OR (sections_dept = bioc AND sections_avg > 90) ORDER BY sections_avg",
			"[valid/oR1Comp.json] OR 1 comp",
			"[valid/notOr.json] not or",
			"[valid/orderByTitle.json] order by title",
			"[valid/orderByYear.json] order by year",
			"[valid/orderByFail.json] order by fail",
			"[valid/aND1Comp.json] AND 1 comp",
			"[valid/no_order.json] no order",
			"[valid/order1.json] order by instructor",
			"[valid/order2.json] order by audit",
			"[valid/order3.json] order by pass",
			"[valid/order4.json] order by uuid",
			"[valid/filter_by_id.json] filter by id",
			"[valid/double_ast.json] double ast",
			"[valid/notAnd3.json] not and3",
			"[valid/doubleNegation.json] double negation",
			"[invalid/wrongFormatWhere.json] wrong format where",
			"[invalid/lowerCaseGt.json] lower case gt",
			"[invalid/lowerCaseOr.json] lower case or",
			"[invalid/lowerCaseNot.json] lower case not",
			"[invalid/caseSensitiveIdstring.json] case sensitive idstring",
			"[invalid/idstringWith_.json] idstring with _",
			"[invalid/emptyIdstring.json] empty idstring",
			"[invalid/emptyMkey.json] empty mkey",
			"[invalid/mkeyNo_.json] mkey no _",
			"[invalid/oneCharIdstring.json] one char idstring",
			"[invalid/noIdstringAnd_.json] no idstring and _",
			"[invalid/mkeyWithSfield.json] mkey with sfield",
			"[invalid/mkeyWithStringAsKey.json] mkey with string as key",
			"[valid/mkeyWithDecimalNumber.json] mkey with decimal number",
			"[invalid/andIsInvalidObject.json] and is invalid object",
			"[valid/andLt_Gt.json] avg > 96 and avg < 97",
			"[invalid/andEmptyKeylist.json] and empty keylist",
			"[invalid/andEmptyKeylistMissingBrace.json] and empty keylist missing brace",
			"[invalid/whereHas2Keys.json] where has 2 keys",
			"[invalid/invalidKeyInColumns.json] invalid key in columns",
			"[invalid/queryNotAnObject.json] query not an object",
			"[invalid/notIsNotAnObject.json] not is not an object",
			"[invalid/isIsNotAnObject.json] is is not an object",
			"[invalid/eqIsNotAnObject.json] eq is not an object",
			"[valid/optionsAndBodySwapped.json] options and body swapped",
			"[valid/bodyOptionsBody.json] body options body",
			"[valid/bodyBodyOptions.json] body body options",
			"[valid/optionsBodyOptions.json] options body options",
			"[invalid/skeyWithMfield.json] skey with mfield",
			"[invalid/columnsInvalidKeylist.json] columns invalid keylist",
			"[invalid/orderInvalidKeylist.json] order invalid keylist",
			"[invalid/orderNotAString.json] order is not a string",
			"[invalid/wHEREWith2Keys.json] WHERE with 2 keys",
			"[invalid/gt_than_one_logic.txt] SELECT pass, audit, dept, avg WHERE avg == 97",
			"[invalid/datasetNotAdded.json] dataset not added",
			"[invalid/missingWhereWithContent.json] missing where with content",
			"[valid/lTNegativeVal.json] lt negative value",
			"[invalid/order_key_not_in_columns.json] Wrong ORDER key",
			"[invalid/invalid8.json] Query missing valid OPTIONS key",
			"[invalid/invalid7.json] SELECT dept, uuid, avg WHERE avg > 93 AND NOT",
			"[invalid/invalid6.json] SELECT dept, uuid, avg WHERE avg > 93 AND avg is 95",
			"[invalid/invalid5.json] SELECT pass, audit, dept, avg WHERE dept == apbl",
			"[invalid/invalid4.json] SELECT pass, audit, dept, avg WHERE avg == 97",
			"[invalid/invalid3.json] SELECT pass, audit, dept, avg WHERE avg == 97",
			"[invalid/invalid2.json] SELECT pass, audit, dept, avg WHERE avg == 97",
			"[invalid/invalid1.json] Query missing OPTIONS",
			"[invalid/invalid.json] Query missing WHERE",
			"[invalid/options_no_columns.json] SELECT dept, uuid, avg WHERE NOT avg > 95 AND dep = *psc",
			"[invalid/options_no_columns1.json] SELECT dept, uuid, avg WHERE NOT avg > 95 AND dep = *psc",
			"[invalid/gt_than_one_logic.json] SELECT sections_dept sections_avg WHERE section_avg > 80 OR section_avg < 85",
			"[invalid/missing_logic.json] SELECT sections_dept sections_avg WHERE AND",
			"[invalid/triple_ast.json] SELECT dept, uuid, avg WHERE avg > 93 AND dep = ***",
			"[invalid/wildcard_ast_in_btwn.json] SELECT dept, uuid, avg WHERE avg > 93 AND dep = cp*c",
			"[invalid/output_too_large.json] SELECT dept, avg - RESULT TOO LARGE",
			"[invalid/reference_too_many_datasets.json] SELECT sections_dept sections_avg WHERE section_avg > 80 AND section_year = 202*",
			"[invalid/excessKeysInQuery.json] WHERE OPTIONS and HOW keys in Query",
			"[valid/uuidTest.json] check uuid type",
			"[valid/orderByUuid.json] order by uuid",
			"[valid/yearTest.json] order by year",
			"[valid/noOrder.json] no order",
			"[valid/notAnd.json] not and",
			"[valid/notAnd2.json] not and2",
		];

		// Automated test cases for sections
		for (const testCase of sectionTestCases) {
			it(testCase, checkQuery);
		}
	});

	describe("ListDataset - rooms", function () {
		beforeEach(async function () {
			// This section resets the insightFacade instance
			// This runs before each test
			await clearDisk();
			facade = new InsightFacade();
		});

		it("list all ubc rooms", async function () {
			sections = await getContentFromArchives("rooms/campus.zip");
			await facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
			const datasets = await facade.listDatasets();

			expect(datasets).to.deep.equal([
				{
					id: "ubc",
					kind: InsightDatasetKind.Rooms,
					numRows: 364,
				},
			]);
		});

		it("list one dataset - rooms ", async function () {
			sections = await getContentFromArchives("rooms/test2.zip");
			await facade.addDataset("test3", sections, InsightDatasetKind.Rooms);

			const datasets = await facade.listDatasets();
			//console.log(datasets[1])

			expect(datasets).to.deep.equal([
				{
					id: "test3",
					kind: InsightDatasetKind.Rooms,
					numRows: 16,
				},
			]);
		});

		it("list 2 datasets - rooms", async function () {
			try {
				sections = await getContentFromArchives("rooms/test2.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Rooms);

				const sections1 = await getContentFromArchives("rooms/missing_fields2.zip");
				await facade.addDataset("test5", sections1, InsightDatasetKind.Rooms);

				const datasets = await facade.listDatasets();
				const EXPECTED_LENGTH = 2;
				expect(datasets.length).to.equal(EXPECTED_LENGTH);
				expect(datasets).to.include.deep.members([
					{
						id: "test3",
						kind: InsightDatasetKind.Rooms,
						numRows: 16,
					},
					{
						id: "test5",
						kind: InsightDatasetKind.Rooms,
						numRows: 2,
					},
				]);
			} catch (err) {
				expect.fail(`you failed to load the right sets ${err}`);
			}
		});

		it("list and remove datasets - rooms", async function () {
			try {
				sections = await getContentFromArchives("rooms/test2.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Rooms);

				const sections1 = await getContentFromArchives("rooms/missing_fields2.zip");
				await facade.addDataset("test5", sections1, InsightDatasetKind.Rooms);

				const datasets = await facade.listDatasets();
				const EXPECTED_LENGTH = 2;
				expect(datasets.length).to.equal(EXPECTED_LENGTH);
				expect(datasets).to.include.deep.members([
					{
						id: "test3",
						kind: InsightDatasetKind.Rooms,
						numRows: 16,
					},
					{
						id: "test5",
						kind: InsightDatasetKind.Rooms,
						numRows: 2,
					},
				]);

				await facade.removeDataset("test3");
				const result2 = await facade.listDatasets();
				const EXPECTED_NEW_LENGTH = 1;
				expect(result2.length).to.equal(EXPECTED_NEW_LENGTH);
				expect(result2).to.include.deep.members([
					{
						id: "test5",
						kind: InsightDatasetKind.Rooms,
						numRows: 2,
					},
				]);
			} catch (err) {
				expect.fail(`you failed to load the right sets: ${err}`);
			}
		});

	});

	describe("ListDataset - Sections", function () {
		beforeEach(async function () {
			// This section resets the insightFacade instance
			// This runs before each test
			await clearDisk();
			facade = new InsightFacade();
		});

		it("list all ubc sections", async function () {
			sections = await getContentFromArchives("sections/pair.zip");
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const datasets = await facade.listDatasets();

			expect(datasets).to.deep.equal([
				{
					id: "ubc",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
			]);
		});

		it("list one dataset", async function () {
			sections = await getContentFromArchives("sections/test3.zip");
			// const pairs = await getContentFromArchives("pair.zip");
			await facade.addDataset("test3", sections, InsightDatasetKind.Sections);
			// const facade2 = new InsightFacade()
			// await facade2.addDataset("test2", sections, InsightDatasetKind.Sections)
			// await facade2.addDataset("pair", pairs, InsightDatasetKind.Sections)
			// await facade.logNewDatasetFromDiskToMap("pair", InsightDatasetKind.Sections)
			const datasets = await facade.listDatasets();
			//console.log(datasets[1])

			expect(datasets).to.deep.equal([
				{
					id: "test3",
					kind: InsightDatasetKind.Sections,
					numRows: 2,
				},
			]);
		});

		it("list 2 datasets", async function () {
			try {
				sections = await getContentFromArchives("sections/test3.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Sections);

				const sections1 = await getContentFromArchives("sections/test5.zip");
				await facade.addDataset("test5", sections1, InsightDatasetKind.Sections);

				const datasets = await facade.listDatasets();
				const EXPECTED_LENGTH = 2;
				expect(datasets.length).to.equal(EXPECTED_LENGTH);
				expect(datasets).to.include.deep.members([
					{
						id: "test3",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
					{
						id: "test5",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
				]);
			} catch (err) {
				expect.fail(`you failed to load the right sets ${err}`);
			}
		});

		it("list and remove datasets", async function () {
			try {
				sections = await getContentFromArchives("sections/test3.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Sections);

				const sections1 = await getContentFromArchives("sections/test5.zip");
				await facade.addDataset("test5", sections1, InsightDatasetKind.Sections);

				const datasets = await facade.listDatasets();
				const EXPECTED_LENGTH = 2;
				expect(datasets.length).to.equal(EXPECTED_LENGTH);
				expect(datasets).to.include.deep.members([
					{
						id: "test3",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
					{
						id: "test5",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
				]);

				await facade.removeDataset("test3");
				const result2 = await facade.listDatasets();
				const EXPECTED_NEW_LENGTH = 1;
				expect(result2.length).to.equal(EXPECTED_NEW_LENGTH);
				expect(result2).to.include.deep.members([
					{
						id: "test5",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
				]);
			} catch (err) {
				expect.fail(`you failed to load the right sets: ${err}`);
			}
		});

		it("list mult datasets", async function () {
			try {
				sections = await getContentFromArchives("sections/test3.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Sections);

				const sections1 = await getContentFromArchives("sections/test5.zip");
				await facade.addDataset("test5", sections1, InsightDatasetKind.Sections);

				const sections2 = await getContentFromArchives("sections/test6.zip");
				await facade.addDataset("test6", sections2, InsightDatasetKind.Sections);

				const datasets = await facade.listDatasets();
				const EXPECTED_LENGTH = 3;
				expect(datasets.length).to.equal(EXPECTED_LENGTH);
				expect(datasets).to.include.deep.members([
					{
						id: "test6",
						kind: InsightDatasetKind.Sections,
						numRows: 9,
					},
					{
						id: "test3",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
					{
						id: "test5",
						kind: InsightDatasetKind.Sections,
						numRows: 2,
					},
				]);
			} catch (err) {
				expect.fail(`you failed to load the right sets ${err}`);
			}
		});
	});

});
