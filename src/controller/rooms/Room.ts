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
	private id: string;

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
		this.id = id;
		this._mfields = { lat, lon, seats };
		this._sfields = { ...this.getSfields(), ...sfields } as Sfield;
	}

	public getMfields(): Mfield {
		return this._mfields;
	}

	public setMfields(value: Mfield): void {
		this._mfields = value;
	}

	public setHref(newHref: string): void {
		this._sfields.href = newHref;
	}

	public setMfield(index: number, newVal: number): void {
		const keys: (keyof Mfield)[] = ["lat", "lon", "seats"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		this._mfields[keys[index]] = newVal;
	}

	public setSField(index: number, newVal: string): void {
		const keys: (keyof Sfield)[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		this._sfields[keys[index]] = newVal;
	}

	public getSfields(): Sfield {
		return this._sfields;
	}

	public setSfields(value: Sfield): void {
		this._sfields = value;
	}

	public getMFieldByIndex(index: number): number {
		const keys: (keyof Mfield)[] = ["lat", "lon", "seats"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		return this._mfields[keys[index]];
	}

	public getSFieldByIndex(index: number): string {
		const keys: (keyof Sfield)[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		return this._sfields[keys[index]];
	}

	public getSFieldIndex(sfield: string): number {
		const keys: (keyof Sfield)[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
		return keys.indexOf(sfield as keyof Sfield);
		// -1 if index is not found
	}

	public getMFieldIndex(mfield: string): number {
		const keys: (keyof Mfield)[] = ["lat", "lon", "seats"];
		return keys.indexOf(mfield as keyof Mfield);
		// -1 if index is not found
	}

	public getID(): string {
		return this.id;
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
}
