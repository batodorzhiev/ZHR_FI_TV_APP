sap.ui.define([
		"ZHR_FI_TV_APP/ZHR_FI_TV_APP/controller/BaseController"
	], function (BaseController) {
		"use strict";

		return BaseController.extend("ZHR_FI_TV_APP.ZHR_FI_TV_APP.controller.NotFound", {

			/**
			 * Navigates to the worklist when the link is pressed
			 * @public
			 */
			onLinkPressed : function () {
				this.getRouter().navTo("worklist");
			}

		});

	}
);