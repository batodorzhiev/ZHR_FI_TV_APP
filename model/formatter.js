sap.ui.define([], function() {
	"use strict";

	return {
		formReqVisibility: function(status1, status2) {
			var visible = false;
			if (status1 && status2 && ((status1 === "1" && Number(status2) >= 8) || (status1 === "2" && Number(status2) >= 8) || (status1 === "3" &&
					Number(status2) >= 8))) {
				visible = true;
			}
			return visible;
		},
		color: function(value) {
			if (typeof value === "string") {
				var state = value.toLowerCase();
				if (state === "02" || state === "05" || state === "11") {
					return "Warning";
				} else if (state === "03" || state === "06" || state === "09" || state === "10") {
					return "Success";
				} else if (state === "04" || state === "07" || state === "08") {
					return "Error";
				} else {
					return "None";
				}
			}
		},
		icon: function(value) {
			if (typeof value === "string") {
				var state = value.toLowerCase();
				switch (state) {
					case "01":
						return "sap-icon://user-edit";
					case "02":
						return "sap-icon://create-form";
					case "03":
						return "sap-icon://user-edit";
					case "04":
						return "sap-icon://edit";
					case "05":
						return "sap-icon://add-equipment";
					case "06":
						return "sap-icon://employee-approvals";
					case "07":
						return "sap-icon://cancel-maintenance";
					case "08":
						return "sap-icon://unlocked";
					case "09":
						return "sap-icon://accept";
					case "10":
						return "sap-icon://locked";
					case "11":
						return "sap-icon://multi-select";
					default:
						return "sap-icon://overflow";
				}
			}
		},
		numbers: function(value) {
			if (typeof value === "string") {
				if (value.charAt(0) === "0") {
					value = value.substr(1);
				}
				return value;
			}
		},
		tripsLength: function(value) {
			console.log(value);
		},
		statusColor: function(status1, status2) {
			if (typeof status1 === "string" && typeof status2 === "string") {
				if (status2 === "02" || status2 === "04" || status2 === "06" || status2 === "17") {
					return "Error";
				} else if (status2 === "03" || status2 === "07" || status2 === "09") {
					return "Warning";
				} else if (status2 === "05" || status2 === "08" || status2 === "10" || status2 === "13" || status2 === "15" || status2 === "16") {
					return "Success";
				} else {
					return "None";
				}
			}
		},
		currency: function(e) {
			if (e && typeof e === "string") {
				return this.formatter.getCurrencyValue(e);
			} else if (e) {
				var input = e.getSource(),
					value = this.formatter.getCurrencyValue(input.getValue());
				input.setValue(value);
			}
		},

		getCurrencyValue: function(value) {
			var oCurrency = new sap.ui.model.type.Currency({
				showMeasure: false,
				maxFractionDigits: 2
			});
			if (value.indexOf(",") > -1) {
				value = value.replace(",", ".");
			}
			value = Number(value.replace(/\s/g, ''));
			var newValue = oCurrency.formatValue([value], "string"),
				returnValue = newValue ? newValue : "0.00";
			return returnValue;
		}
	};

});