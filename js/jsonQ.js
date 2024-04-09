class JSONQuery {
	constructor(data) {
		this.data = data;
	}

	select(fields) {
		if (!fields || fields === "*") {
			return this.data;
		} else {
			const selectedData = [];
			this.data.forEach(item => {
				const selectedItem = {};
				fields.forEach(field => {
					if (item.hasOwnProperty(field)) {
						selectedItem[field] = item[field];
					}
				});
				selectedData.push(selectedItem);
			});
			return selectedData;
		}
	}

	where(condition) {
		if (!condition) {
			return this.data;
		} else {
			const filteredData = [];
			this.data.forEach(item => {
				if (this.evaluateCondition(item, condition)) {
					filteredData.push(item);
				}
			});
			return filteredData;
		}
	}

	evaluateCondition(item, condition) {
		let operator = condition.operator.toLowerCase();
		let field = condition.field;
		let value = condition.value;
		let needed = item[field];

		if (typeof value == 'string') {
			value = value.toLowerCase();
			needed = needed.toLowerCase();
		}

		switch (operator) {
			case "=":
				return needed == value;
			case ">":
				return needed > value;
			case "<":
				return needed < value;
			case ">=":
				return needed >= value;
			case "<=":
				return needed <= value;
			case "!=": case "<>":
				return needed !== value;
			case "like":
				if (typeof needed === 'string') {
					const pattern = new RegExp('^' + value.replace(/%/g, '.*') + '$');
					return pattern.test(needed);
				} else {
					return false;
				}
			case "in":
				return value.includes(needed);
			case "not in":
				return !value.includes(needed);
			case "is null":
				return needed === null || needed === undefined;
			case "is not null": case "not null":
				return needed !== null && needed !== undefined;
			default:
				return false;
		}
	}

	execute(query, format) {
		var { select, where } = query;
		var result = this.data;

		if (select) {
			result = this.select(select.fields);
		}

		if (where) {
			result = this.where(where.condition);
		}

		if (format != undefined) {
			var oldResult = result;
			result = [];
			oldResult.forEach(function (item, i) {
				if (Array.isArray(format.expressions) && Object.keys(format.expressions).length) {
					if (Array.isArray(format.modify)) {
						format.modify.forEach(function (field) {
							if (item[field] != undefined) {
								format.expressions.forEach(function (object) {
									for (var expression in object) {
										// console.log(object, expression);
										switch (expression) {
											case 'concat':
												var obj = {};
												Object.keys(oldResult[0]).forEach(function (column) {
													if (column !== field && item[column] != undefined) {
														obj[column] = item[column];
													}
												});
												obj[field] = item[field];
												object[expression].forEach(extraField => {
													obj[field] += (item[extraField] != undefined) ? item[extraField] : extraField;
												});	
												result.push(obj);
											break;
										}
									}
								});
							}
						});
					}
				}
			});

			if (result.length == 0) {
				result = oldResult;
			}
		}

		return result;
	}
}
