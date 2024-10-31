import Building from "./Building";

export interface Sfield {
	fullname: string;
	shortname: string;
	number: string;
	name: string;
	address: string;
	type: string;
	furniture: string;
	href: string;
}

export interface Mfield {
	lat: number;
	lon: number;
	seats: number;
}

interface RoomJSON {
	setID: string;
	sFields: Sfield;
	mFields: {
		lat: number;
		lon: number;
		seats: number;
	};
}

export default class Room extends Building {
	public name: string;
	public lat: number;
	public lon: number;
	public seats: number;
	public href: string;
	public type: string;
	public furniture: string;
	public number: string;
	constructor(
		id: string,
		{ lat, lon, seats }: Mfield,
		sfields: Partial<Sfield>,
		building: Building // Accepting a Building instance
	) {
		super({
			fullname: building.getFullname(),
			shortname: building.getShortname(),
			address: building.getAddress(),
			href: building.getbHref(),
		});
		this.name = id;
		this._mfields = { lat, lon, seats };
		this._sfields = {
			fullname: sfields.fullname || building.getFullname(),
			shortname: sfields.shortname || building.getShortname(),
			address: sfields.address || building.getAddress(),
			href: sfields.href || building.getbHref(),
			...sfields,
		} as Sfield;
		this.lon = lon;
		this.lat = lat;
		this.seats = Number(seats);
		this.type = this._sfields.type;
		this.furniture = this._sfields.furniture;
		this.href = this._sfields.href;
		this.number = this._sfields.number;
		this.name = this._sfields.name;
	}

	public getSfields(): Sfield {
		return this._sfields;
	}

	public getMfields(): Mfield {
		return this._mfields;
	}

	public getSFieldByIndex(index: number): string {
		const keys: (keyof Sfield)[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		return this._sfields[keys[index]];
	}

	public getID(): string {
		return this.name;
	}

	public convertToJSON(): { setID: string; sFields: Sfield; mFields: Mfield } {
		return {
			setID: this.getID(),
			sFields: { ...this._sfields },
			mFields: { ...this._mfields },
		};
	}

	public static fromJSON(json: RoomJSON): Room {
		const { setID, sFields, mFields } = json;

		// validate required fields
		if (!setID || !sFields || !mFields) {
			throw new Error("Invalid JSON data for Room.");
		}

		// extract building-related fields
		const { fullname, shortname, address, href } = sFields;

		// create building
		const building = new Building({ fullname, shortname, address, href });

		// get room-specific fields
		const { number, name, type, furniture } = sFields;
		let seats: number;
		if (typeof mFields.seats === "number") {
			seats = mFields.seats;
		} else {
			throw new Error(`Invalid type for seats`);
		}

		// create the Mfield object
		const mfields: Mfield = {
			lat: mFields.lat,
			lon: mFields.lon,
			seats: seats,
		};

		// create the Sfield object
		const sfields: Sfield = {
			fullname,
			shortname,
			number,
			name,
			address,
			type,
			furniture,
			href,
		};

		// instantiate and return the Room object
		return new Room(setID, mfields, sfields, building);
	}

	// public setMfield(index: number, newVal: number): void {
	// 	const keys: (keyof Mfield)[] = ["lat", "lon", "seats"];
	// 	if (index < 0 || index > keys.length) {
	// 		throw new Error("Out of bounds");
	// 	}
	// 	this._mfields[keys[index]] = newVal;
	// }

	// public getSFieldIndex(sfield: string): number {
	// 	const keys: (keyof Sfield)[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	// 	return keys.indexOf(sfield as keyof Sfield);
	// 	// -1 if index is not found
	// }

	// public getMFieldIndex(mfield: string): number {
	// 	const keys: (keyof Mfield)[] = ["lat", "lon", "seats"];
	// 	return keys.indexOf(mfield as keyof Mfield);
	// 	// -1 if index is not found
	// }
	// public getMFieldByIndex(index: number): number {
	// 	const keys: (keyof Mfield)[] = ["lat", "lon", "seats"];
	// 	if (index < 0 || index > keys.length) {
	// 		throw new Error("Out of bounds");
	// 	}
	// 	return this._mfields[keys[index]];
	// }

	// public setMfields(value: Mfield): void {
	// 	this._mfields = value;
	// }

	// public setHref(newHref: string): void {
	// 	this._sfields.href = newHref;
	// 	this.href = newHref;
	// }

	// public setSField(index: number, newVal: string): void {
	// 	const keys: (keyof Sfield)[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	// 	if (index < 0 || index > keys.length) {
	// 		throw new Error("Out of bounds");
	// 	}
	// 	this._sfields[keys[index]] = newVal;
	// }
	//
	// public setSfields(value: Sfield): void {
	// 	this._sfields = value;
	// }

	//
	// public getLat(): number {
	// 	return this.lat;
	// }
	//
	// public getLon(): number {
	// 	return this.lon;
	// }
	//
	// public getSeats(): number {
	// 	return this.seats;
	// }
	//
	// public getHref(): string {
	// 	return this.href;
	// }
}
