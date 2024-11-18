import { expect } from "chai";
import request, { Response } from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server";
import fs from "fs";
import { clearDisk } from "../TestUtil";
describe("Facade C3", function () {
	let server: Server;
	before(async function () {
		// TODO: start server here once and handle errors properly
		return new Promise((resolve, reject) => {
			const PORT_NUMBER = 4321;
			server = new Server(PORT_NUMBER); // Replace with the appropriate port
			server
				.start()
				.then(() => {
					Log.info("Server started successfully");
					resolve();
				})
				.catch((err) => {
					Log.error(`Error starting server: ${err.message}`);
					reject(err);
				});
		});
	});

	after(function () {
		// TODO: stop server here once!
		void server.stop();
	});

	beforeEach(async function () {
		// might want to add some process logging here to keep track of what is going on
		await clearDisk();
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/section/sections";
		const ZIP_FILE_DATA = "test/resources/archives/sections/test3.zip";

		const zipFileData = await fs.promises.readFile(ZIP_FILE_DATA);
		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(zipFileData)
				.set("Content-Type", "application/zip")
				.then(function (res: Response) {
					Log.info(`Response: ${JSON.stringify(res.body)}`);
					expect(res.status).to.be.equal(StatusCodes.OK);
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	it("should deny repeat adds", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/section1/sections";
		const ZIP_FILE_DATA = "test/resources/archives/sections/test3.zip";
		const zipFileData = await fs.promises.readFile(ZIP_FILE_DATA);

		// First add
		const firstAddResponse = await request(SERVER_URL)
			.put(ENDPOINT_URL)
			.send(zipFileData)
			.set("Content-Type", "application/zip");

		Log.info(`First add response: ${JSON.stringify(firstAddResponse.body)}`);
		expect(firstAddResponse.status).to.be.equal(StatusCodes.OK);

		// Second add with the same data (should fail)
		const secondAddResponse = await request(SERVER_URL)
			.put(ENDPOINT_URL)
			.send(zipFileData)
			.set("Content-Type", "application/zip");

		Log.info(`Second add response: ${JSON.stringify(secondAddResponse.body)}`);
		expect(secondAddResponse.status).to.be.equal(StatusCodes.BAD_REQUEST);
		//expect(secondAddResponse.body.err).to.be.equal("InsightError");
	});

	// it("should deny repeat adds", async function () {
	// 	const SERVER_URL = "http://localhost:4321";
	// 	const ENDPOINT_URL = "/dataset/section/sections";
	// 	const ZIP_FILE_DATA = "test/resources/archives/sections/test3.zip";
	// 	const zipFileData = await fs.promises.readFile(ZIP_FILE_DATA);
	//
	// 	// First add
	// 	return request(SERVER_URL)
	// 		.put(ENDPOINT_URL)
	// 		.send(zipFileData)
	// 		.set("Content-Type", "application/zip")
	// 		.then(function (res: Response) {
	// 			// Check first response
	// 			Log.info(`First add response: ${JSON.stringify(res.body)}`);
	// 			expect(res.status).to.be.equal(StatusCodes.OK);
	//
	// 			// Second add with the same data
	// 			return request(SERVER_URL)
	// 				.put(ENDPOINT_URL)
	// 				.send(zipFileData)
	// 				.set("Content-Type", "application/zip");
	// 		})
	// 		.then(function (res: Response) {
	// 			// second response - it should fail
	// 			Log.info(`Second add response: ${JSON.stringify(res.body)}`);
	// 			Log.info(res.body)
	// 			expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
	// 			expect(res.body.err).to.be.equal('InsightError');
	// 		})
	// 		.catch((err) => {
	// 			Log.error(err);
	//
	// 		});
	// });

	it("should deny invalid id format", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/section_/sections";
		const ZIP_FILE_DATA = "test/resources/archives/sections/test3.zip";

		const zipFileData = await fs.promises.readFile(ZIP_FILE_DATA);
		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(zipFileData)
				.set("Content-Type", "application/zip")
				.then(function (res: Response) {
					Log.info(`Response: ${JSON.stringify(res.body)}`);
					expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
				});
		} catch (err) {
			Log.error(err);

			// and some more logging here!
		}
	});

	it("should remove dataset", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/section2/sections";
		const ENDPOINT_URL_REMOVAL = "/dataset/section2";
		const ZIP_FILE_DATA = "test/resources/archives/sections/test3.zip";

		const zipFileData = await fs.promises.readFile(ZIP_FILE_DATA);
		return request(SERVER_URL)
			.put(ENDPOINT_URL)
			.send(zipFileData)
			.set("Content-Type", "application/zip")
			.then(function (res: Response) {
				// Check first response
				Log.info(`First add response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.be.equal(StatusCodes.OK);

				// remove dataset
				return request(SERVER_URL)
					.delete(ENDPOINT_URL_REMOVAL)
					.send(zipFileData)
					.set("Content-Type", "application/zip");
			})
			.then(function (res: Response) {
				// second response - it should fail
				Log.info(`Removal response: ${JSON.stringify(res.body)}`);
				Log.info(res.body);
				expect(res.status).to.be.equal(StatusCodes.OK);
				expect(res.body.result).to.be.equal("section2");
			})
			.catch((err) => {
				Log.error(err);
			});
	});

	it("should list with no datasets added", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/datasets";
		try {
			return request(SERVER_URL)
				.get(ENDPOINT_URL)
				.then(function (res: Response) {
					Log.info(`Response: ${JSON.stringify(res.body)}`);
					expect(res.status).to.be.equal(StatusCodes.OK);
				});
		} catch (err) {
			Log.error(err);
			expect.fail("FAILED");
			// and some more logging here!
		}
	});

	it("should list with valid datasets added", async function () {
		const SERVER_URL = "http://localhost:4321";
		const GET_ENDPOINT_URL = "/datasets";
		const ENDPOINT_URL = "/dataset/courses/sections";
		const ZIP_FILE_DATA = "test/resources/archives/sections/test3.zip";

		const zipFileData = await fs.promises.readFile(ZIP_FILE_DATA);
		return request(SERVER_URL)
			.put(ENDPOINT_URL)
			.send(zipFileData)
			.set("Content-Type", "application/zip")
			.then(function (res: Response) {
				// Check first response
				Log.info(`First add response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.be.equal(StatusCodes.OK);

				// get dataset
				return request(SERVER_URL).get(GET_ENDPOINT_URL);
			})
			.then(function (res: Response) {
				// second response - it should fail
				Log.info(`Removal response: ${JSON.stringify(res.body)}`);
				Log.info(res.body);
				expect(res.status).to.be.equal(StatusCodes.OK);
				//expect(res.body.result).to.deep.equal([ { id: 'section2', kind: 'sections', numRows: 2 } ]);
			})
			.catch((err) => {
				Log.error(err);
			});
	});

	it("should query a course's avg over the years", async function () {
		const TIMEOUT = 10000;
		this.timeout(TIMEOUT);
		const SERVER_URL = "http://localhost:4321";
		const POST_ENDPOINT_URL = "/query";
		const ENDPOINT_URL = "/dataset/section2/sections";
		const ZIP_FILE_DATA = "test/resources/archives/sections/pair.zip";
		const setId = "section2";
		const courseDept = "cpsc";
		const courseNum = "110";
		const query: any = `{
        "WHERE": {
            "AND": [
                {"IS": {"${setId}_dept": "${courseDept}"}},
                {"IS": {"${setId}_id": "${courseNum}"}}
            ]
        },
        "OPTIONS": {
            "COLUMNS": ["${setId}_year", "averageGrades"],
            "ORDER": "${setId}_year"
        },
        "TRANSFORMATIONS": {
            "GROUP": ["${setId}_year"],
            "APPLY": [
                {"averageGrades": {"AVG": "${setId}_avg"}}
            ]
        }
    }`;

		const zipFileData = await fs.promises.readFile(ZIP_FILE_DATA);
		return request(SERVER_URL)
			.put(ENDPOINT_URL)
			.send(zipFileData)
			.set("Content-Type", "application/zip")
			.then(function (res: Response) {
				// Check first response
				Log.info(`First add response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.be.equal(StatusCodes.OK);
				// get send query
				return request(SERVER_URL).post(POST_ENDPOINT_URL).send(query).set("Content-Type", "application/json");
			})
			.then(function (res: Response) {
				// second response - it should fail
				Log.info(`Query response: ${JSON.stringify(res.body)}`);
				Log.info(res.body);
				expect(res.status).to.be.equal(StatusCodes.OK);
				expect(res.body.result).to.deep.equal({
					result: [
						{ sections_year: 1900, averageGrades: 74.53 },
						{ sections_year: 2009, averageGrades: 71.99 },
						{ sections_year: 2010, averageGrades: 76.37 },
						{ sections_year: 2011, averageGrades: 76.99 },
						{ sections_year: 2012, averageGrades: 73.9 },
						{ sections_year: 2013, averageGrades: 73.35 },
						{ sections_year: 2014, averageGrades: 73.38 },
						{ sections_year: 2015, averageGrades: 73.35 },
					],
				});
			})
			.catch((err) => {
				Log.error(err);
			});
	});

	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
});
