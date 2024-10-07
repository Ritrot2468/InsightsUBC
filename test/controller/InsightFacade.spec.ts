import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
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

	// Original Add Dataset test from repo.
	// before(async function () {
	// 	// This block runs once and loads the datasets.
	// 	sections = await getContentFromArchives("pair.zip");
	//
	// 	// Just in case there is anything hanging around from a previous run of the test suite
	// 	await clearDisk();
	// });

	// describe("AddDataset", function () {
	// 	beforeEach(function () {
	// 		// This section resets the insightFacade instance
	// 		// This runs before each test
	// 		facade = new InsightFacade();
	// 	});
	//
	// 	afterEach(async function () {
	// 		// This section resets the data directory (removing any cached data)
	// 		// This runs after each test, which should make each test independent of the previous one
	// 		await clearDisk();
	// 	});
	//
	// 	it("should reject with  an empty dataset id", async function () {
	// 		try {
	// 			await facade.addDataset("", sections, InsightDatasetKind.Sections);
	// 		} catch (err) {
	// 			expect(err).to.be.instanceOf(InsightError);
	// 		}
	// 		expect.fail("Should have thrown above.");
	// 	});
	// });

	describe("AddDataset", function () {
		//let facade: IInsightFacade;

		// Declare datasets used in tests. You should add more datasets like this!
		//let sections: string;
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
			sections = await getContentFromArchives("test1.zip");
			sections2 = await getContentFromArchives("test3.zip");
			empty = await getContentFromArchives("empty-zip.zip");
			defectiveSet = await getContentFromArchives("all_invalid_sections_in_one_course.zip");
			defectiveSet1 = await getContentFromArchives("no_valid_sections.zip");
			emptyCourse = await getContentFromArchives("empty_file.zip");
			noJson = await getContentFromArchives("no_json.zip");
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
			// const result = await facade.addDataset(
			// 	"red_",
			// 	sections,
			// 	InsightDatasetKind.Sections
			// )
			// return expect(result).to.eventually.be.rejectedWith(InsightError);
			await expect(facade.addDataset("red_", sections, InsightDatasetKind.Sections)).to.be.rejectedWith(InsightError);
		});

		it("should reject with an underscore2", async function () {
			// const result = facade.addDataset(
			// 	"_1_",
			// 	sections,
			// 	InsightDatasetKind.Sections
			// );
			// return expect(result).to.eventually.be.rejectedWith(InsightError);
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
			// const result = await ;
			// await expect(
			// 	facade.addDataset("sections", sections, InsightDatasetKind.Sections)
			// ).to.eventually.have.members(["sections"]);

			const result = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			return expect(result).to.have.members(["sections"]);
		});

		it("should add valid data properly (valid id - one char)", async function () {
			// const result = await
			// // TODO:
			// await expect(
			// 	facade.addDataset("s", sections, InsightDatasetKind.Sections)
			// ).to.eventually.have.members(["s"]);
			const result = await facade.addDataset("s", sections, InsightDatasetKind.Sections);

			return expect(result).to.have.members(["s"]);
		});

		it("should add valid data properly (valid id - space between)", async function () {
			const result = await facade.addDataset(" s ", sections, InsightDatasetKind.Sections);

			return expect(result).to.have.members([" s "]);
		});

		// test content data
		it("should add valid data properly (invalid content not 64 - space between)", async function () {
			// const result = await

			//return expect(result).to.eventually.have.members(["sections"]);
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
	});

	// added James' tests for removeDataset (async tests with try catch)
	describe("RemoveDataset", function () {
		beforeEach(async function () {
			//  This section resets the insightFacade instance
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
				// facade.sectionsDatabase.forEach((key, value) => {
				// 	console.log(key, value)
				// })
				if (errorExpected) {
					expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
				}
				expect(result).to.have.deep.members(expected);
				//expect(result).to.include.members(expected);
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
		// async function checkQuery(this: Mocha.Context): Promise<void> {
		// 	if (!this.test) {
		// 		throw new Error(
		// 			"Invalid call to checkQuery." +
		// 				"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
		// 				"Do not invoke the function directly."
		// 		);
		// 	}
		// 	// Destructuring assignment to reduce property accesses
		// 	const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
		// 	let result: InsightResult[] = []; // dummy value before being reassigned
		// 	try {
		// 		result = await facade.performQuery(input);
		// 	} catch (err) {
		// 		if (!errorExpected) {
		// 			expect.fail(`performQuery threw unexpected error: ${err}`);
		// 		}
		// 		// TODO: replace this failing assertion with your assertions. You will need to reason about the code in this function
		// 		// to determine what to put here :)
		// 		return expect.fail("Write your assertion(s) here.");
		// 	}
		// 	if (errorExpected) {
		// 		expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
		// 	}
		// 	// TODO: replace this failing assertion with your assertions. You will need to reason about the code in this function
		// 	// to determine what to put here :)
		// 	return expect.fail("Write your assertion(s) here.");
		// }

		before(async function () {
			facade = new InsightFacade();
			sections = await getContentFromArchives("pair.zip");
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

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		// it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		// it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		//
		it("test title", function() {
			const section = facade.sectionsDatabase.get("sections");
			console.log(section);
		});
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		/*
		it("[valid/simple1.json] SELECT dept, uuid, avg WHERE avg > 93 AND dep = cps*", checkQuery);
		it("[valid/simple2.json] SELECT pass, audit, dept, avg WHERE avg == 97", checkQuery);

		it("[valid/simple3.json] SELECT dept, avg, pass, fail, audit WHERE avg > 93 AND avg > 95", checkQuery);
		it("[valid/case_sensitive_wildcard.json] SELECT dept, uuid, avg WHERE avg > 93 AND dep = CPS*", checkQuery);
		it("[valid/general_ast.json] SELECT dept, uuid, avg WHERE avg > 93 AND dep = *", checkQuery);

		it("[valid/_wildcard.json] SELECT dept, uuid, avg WHERE avg > 95 AND dep = *psc", checkQuery);

		it("[valid/_wildcard_.json] SELECT dept, uuid, avg WHERE avg > 98 AND dep = *ps*", checkQuery);

		it("[valid/negation.json] SELECT dept, uuid, avg WHERE NOT avg > 95 AND dep = *psc", checkQuery);

		it(
			"[valid/gt_than_one_logic1.json] SELECT sections_dept sections_avg WHERE section_avg > 80 OR section_avg < 85",
			checkQuery
		);

		it(
			"[valid/complex1.json] SELECT sections_dept, sections_avg WHERE (sections_avg > 90 AND sections_avg < 100 AND sections_dept LIKE cpsc*) OR (sections_dept = bioc AND sections_avg > 90) ORDER BY sections_avg",
			checkQuery
		);
		it("[valid/oR1Comp.json] OR 1 comp", checkQuery);
		it("[valid/notOr.json] not or", checkQuery);

		it("[valid/orderByTitle.json] order by title", checkQuery);

		it("[valid/orderByYear.json] order by year", checkQuery);

		it("[valid/orderByFail.json] order by fail", checkQuery);

		it("[valid/aND1Comp.json] AND 1 comp", checkQuery);
		it("[valid/no_order.json] no order", checkQuery);
		it("[valid/order1.json] order by instructor", checkQuery);
		it("[valid/order2.json] order by audit", checkQuery);
		it("[valid/order3.json] order by pass", checkQuery);
		it("[valid/order4.json] order by uuid", checkQuery);
		it("[valid/filter_by_id.json] filter by id", checkQuery);
		it("[valid/double_ast.json] double ast", checkQuery);

		it("[valid/notAnd.json] not and", checkQuery);

		it("[valid/doubleNegation.json] double negation", checkQuery);

		it("[invalid/wrongFormatWhere.json] wrong format where", checkQuery);

		it("[invalid/lowerCaseGt.json] lower case gt", checkQuery);

		it("[invalid/lowerCaseOr.json] lower case or", checkQuery);

		it("[invalid/lowerCaseNot.json] lower case not", checkQuery);

		it("[invalid/caseSensitiveIdstring.json] case sensitive idstring", checkQuery);

		it("[invalid/idstringWith_.json] idstring with _", checkQuery);

		it("[invalid/emptyIdstring.json] empty idstring", checkQuery);

		it("[invalid/emptyMkey.json] empty mkey", checkQuery);

		it("[invalid/mkeyNo_.json] mkey no _", checkQuery);

		it("[invalid/oneCharIdstring.json] one char idstring", checkQuery);

		it("[invalid/noIdstringAnd_.json] no idstring and _", checkQuery);

		it("[invalid/mkeyWithSfield.json] mkey with sfield", checkQuery);

		it("[invalid/mkeyWithStringAsKey.json] mkey with string as key", checkQuery);

		it("[valid/mkeyWithDecimalNumber.json] mkey with decimal number", checkQuery);

		it("[invalid/andIsInvalidObject.json] and is invalid object", checkQuery);

		it("[invalid/andEmptyKeylist.json] and empty keylist", checkQuery);

		it("[invalid/andEmptyKeylistMissingBrace.json] and empty keylist missing brace", checkQuery);

		it("[invalid/whereHas2Keys.json] where has 2 keys", checkQuery);

		it("[invalid/emptyStringQuery.json] empty string query", checkQuery);

		it("[invalid/invalidKeyInColumns.json] invalid key in columns", checkQuery);

		it("[invalid/queryNotAnObject.json] query not an object", checkQuery);

		it("[invalid/notIsNotAnObject.json] not is not an object", checkQuery);

		it("[invalid/isIsNotAnObject.json] is is not an object", checkQuery);

		it("[invalid/eqIsNotAnObject.json] eq is not an object", checkQuery);

		it("[valid/optionsAndBodySwapped.json] options and body swapped", checkQuery);

		it("[valid/bodyOptionsBody.json] body options body", checkQuery);

		it("[valid/bodyBodyOptions.json] body body options", checkQuery);

		it("[valid/optionsBodyOptions.json] options body options", checkQuery);

		it("[invalid/skeyWithMfield.json] skey with mfield", checkQuery);

		it("[invalid/columnsInvalidKeylist.json] columns invalid keylist", checkQuery);

		it("[invalid/orderInvalidKeylist.json] order invalid keylist", checkQuery);

		it("[invalid/wHEREWith2Keys.json] WHERE with 2 keys", checkQuery);

		it("[invalid/gt_than_one_logic.txt] SELECT pass, audit, dept, avg WHERE avg == 97", checkQuery);

		it("[invalid/datasetNotAdded.json] dataset not added", checkQuery);
		it("[invalid/missingWhereWithContent.json] missing where with content", checkQuery);

		it("[valid/lTNegativeVal.json] lt negative value", checkQuery);

		it("[invalid/order_key_not_in_columns.json] Wrong ORDER key", checkQuery);
		it("[invalid/invalid8.json] Query missing valid OPTIONS key", checkQuery);
		it("[invalid/invalid7.json] SELECT dept, uuid, avg WHERE avg > 93 AND NOT", checkQuery);
		it("[invalid/invalid6.json] SELECT dept, uuid, avg WHERE avg > 93 AND avg is 95", checkQuery);
		it("[invalid/invalid5.json] SELECT pass, audit, dept, avg WHERE dept == apbl", checkQuery);
		it("[invalid/invalid4.json] SELECT pass, audit, dept, avg WHERE avg == 97", checkQuery);
		it("[invalid/invalid3.json] SELECT pass, audit, dept, avg WHERE avg == 97", checkQuery);
		it("[invalid/invalid2.json] SELECT pass, audit, dept, avg WHERE avg == 97", checkQuery);
		it("[invalid/invalid1.json] Query missing OPTIONS", checkQuery);

		it("[invalid/invalid.json] Query missing WHERE", checkQuery);

		it("[invalid/options_no_columns.json] SELECT dept, uuid, avg WHERE NOT avg > 95 AND dep = *psc", checkQuery);
		it("[invalid/options_no_columns1.json] SELECT dept, uuid, avg WHERE NOT avg > 95 AND dep = *psc", checkQuery);

		it(
			"[invalid/gt_than_one_logic.json] SELECT sections_dept sections_avg WHERE section_avg > 80 OR section_avg < 85",
			checkQuery
		);

		it("[invalid/missing_logic.json] SELECT sections_dept sections_avg WHERE AND", checkQuery);
		it("[invalid/triple_ast.json] SELECT dept, uuid, avg WHERE avg > 93 AND dep = ***", checkQuery);
		it("[invalid/wildcard_ast_in_btwn.json] SELECT dept, uuid, avg WHERE avg > 93 AND dep = cp*c", checkQuery);

		it("[invalid/output_too_large.json] SELECT dept, avg - RESULT TOO LARGE", checkQuery);
		it(
			"[invalid/reference_too_many_datasets.json] SELECT sections_dept sections_avg WHERE section_avg > 80 AND section_year = 202*",
			checkQuery
		);

		it("[invalid/excessKeysInQuery.json] WHERE OPTIONS and HOW keys in Query", checkQuery);*/
	});

	describe("ListDataset", function () {
		beforeEach(async function () {
			// This section resets the insightFacade instance
			// This runs before each test
			await clearDisk();
			facade = new InsightFacade();
		});

		it("list all ubc sections", async function () {
			sections = await getContentFromArchives("pair.zip");
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
			sections = await getContentFromArchives("test3.zip");
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
				sections = await getContentFromArchives("test3.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Sections);

				const sections1 = await getContentFromArchives("test5.zip");
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
				sections = await getContentFromArchives("test3.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Sections);

				const sections1 = await getContentFromArchives("test5.zip");
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
				sections = await getContentFromArchives("test3.zip");
				await facade.addDataset("test3", sections, InsightDatasetKind.Sections);

				const sections1 = await getContentFromArchives("test5.zip");
				await facade.addDataset("test5", sections1, InsightDatasetKind.Sections);

				const sections2 = await getContentFromArchives("test6.zip");
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
