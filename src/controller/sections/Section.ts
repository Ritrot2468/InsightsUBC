export interface Sfield {
	uuid: string;
	id: string;
	title: string;
	instructor: string;
	dept: string;
}

export interface Mfield {
	year: number;
	avg: number;
	pass: number;
	fail: number;
	audit: number;
}

export default class Section {
	public datasetId: string;
	public uuid: string;
	public id: string;
	public title: string;
	public instructor: string;
	public dept: string;

	public year: number;
	public avg: number;
	public pass: number;
	public fail: number;
	public audit: number;

	private _mfields: Mfield;
	private _sfields: Sfield;

	// public getMfields(): Mfield {
	// 	return this._mfields;
	// }

	constructor(setId: string, mfields: Mfield, sfields: Sfield) {
		this.datasetId = setId;
		this._mfields = mfields;
		this._sfields = sfields;

		this.fail = mfields.fail;
		this.pass = mfields.pass;
		this.audit = mfields.audit;
		this.avg = mfields.avg;
		this.year = mfields.year;

		this.uuid = sfields.uuid;
		this.id = sfields.id;
		this.title = sfields.title;
		this.instructor = sfields.instructor;
		this.dept = sfields.dept;
	}
	public setSField(index: number, newVal: string): void {
		const keys: (keyof Sfield)[] = ["uuid", "id", "title", "instructor", "dept"];

		if (index < 0 || index >= keys.length) {
			throw new Error("Out of bounds");
		}

		const key = keys[index];
		this._sfields[key] = newVal;
	}

	public setMfield(index: number, newVal: number): void {
		const keys: (keyof Mfield)[] = ["year", "avg", "pass", "fail", "audit"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		const key = keys[index];
		this._mfields[key] = newVal;
	}

	public getMFieldIndex(mfield: string): number {
		const keys: (keyof Mfield)[] = ["year", "avg", "pass", "fail", "audit"];
		return keys.indexOf(mfield as keyof Mfield);
		// -1 if index is not found
	}

	// public getMFieldByIndex(index: number): number {
	// 	const keys: (keyof Mfield)[] = ["year", "avg", "pass", "fail", "audit"];
	// 	if (index < 0 || index > keys.length) {
	// 		throw new Error("Out of bounds");
	// 	}
	// 	return this._mfields[keys[index]];
	// }

	// public getSFieldByIndex(index: number): string {
	// 	const keys: (keyof Sfield)[] = ["uuid", "id", "title", "instructor", "dept"];
	// 	if (index < 0 || index > keys.length) {
	// 		throw new Error("Out of bounds");
	// 	}
	// 	return this._sfields[keys[index]];
	// }
	//
	// public getSFieldIndex(sfield: string): number {
	// 	const keys: (keyof Sfield)[] = ["uuid", "id", "title", "instructor", "dept"];
	// 	return keys.indexOf(sfield as keyof Sfield);
	// 	// -1 if index is not found
	// }

	//
	// public setSetID(newId: string): void {
	// 	this.datasetId = newId;
	// }
	//

	// public setSField(index: number, newVal: string): void {
	// 	const keys: (keyof Sfield)[] = ["uuid", "id", "title", "instructor", "dept"];
	// 	if (index < 0 || index > keys.length) {
	// 		throw new Error("Out of bounds");
	// 	}
	// 	this._sfields[keys[index]] = newVal;
	// }
	//
	// public getSfields(): Sfield {
	// 	return this._sfields;
	// }
	//
	// public setSfields(value: Sfield): void {
	// 	this._sfields = value;
	// }
	// public setUuid(newUuid: string): void {
	// 	this.uuid = newUuid;
	// 	this._sfields.uuid = newUuid;
	// }
	//
	// public setId(newId: string): void {
	// 	this.id = newId;
	// 	this._sfields.id = newId;
	// }
	//
	// public setTitle(newTitle: string): void {
	// 	this.uuid = newTitle;
	// 	this._sfields.title = newTitle;
	// }
	//
	// public setInstructor(newInstructor: string): void {
	// 	this.instructor = newInstructor;
	// 	this._sfields.instructor = newInstructor;
	// }
	//
	// public setDept(newDept: string): void {
	// 	this.dept = newDept;
	// 	this._sfields.dept = newDept;
	// }
	//
	// public setYear(newYear: number): void {
	// 	this.year = newYear;
	// 	this._mfields.year = newYear;
	// }
	//
	// public setAvg(newAvg: number): void {
	// 	this.avg = newAvg;
	// 	this._mfields.avg = newAvg;
	// }
	//
	// public setPass(newPass: number): void {
	// 	this.pass = newPass;
	// 	this._mfields.pass = newPass;
	// }
	//
	// public setFail(newFail: number): void {
	// 	this.fail = newFail;
	// 	this._mfields.fail = newFail;
	// }
	//
	// public setAudit(newAudit: number): void {
	// 	this.audit = newAudit;
	// 	this._mfields.audit = newAudit;
	// }
	//
	// public getSetID(): string {
	// 	return this.datasetId;
	// }
	//
	// public getUuid(): string {
	// 	return this.uuid;
	// }
	//
	// public getId(): string {
	// 	return this.id;
	// }
	//
	// public getTitle(): string {
	// 	return this.title;
	// }
	//
	// public getInstructor(): string {
	// 	return this.instructor;
	// }
	//
	// public getDept(): string {
	// 	return this.dept;
	// }
	//
	// public getYear(): number {
	// 	return this.year;
	// }
	//
	// public getAvg(): number {
	// 	return this.avg;
	// }
	//
	// public getPass(): number {
	// 	return this.pass;
	// }
	//
	// public getFail(): number {
	// 	return this.fail;
	// }
	//
	// public getAudit(): number {
	// 	return this.audit;
	// }

	// private convertToJSON(): { setID: string; sFields: Sfield; mFields: Mfield } {
	// 	return {
	// 		setID: this.getSetID(),
	// 		sFields: {
	// 			uuid: this._sfields.uuid,
	// 			id: this._sfields.id,
	// 			title: this._sfields.title,
	// 			instructor: this._sfields.instructor,
	// 			dept: this._sfields.dept,
	// 		},
	// 		mFields: {
	// 			year: this._mfields.year,
	// 			avg: this._mfields.avg,
	// 			pass: this._mfields.pass,
	// 			fail: this._mfields.fail,
	// 			audit: this._mfields.audit,
	// 		},
	// 	};
	// }
}
