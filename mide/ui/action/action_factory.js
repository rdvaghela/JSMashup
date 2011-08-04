goog.provide('mashupIDE.ui.action.ActionFactory');

mashupIDE.ui.action.ActionFactory = {
	actions_: {},
	register: function(name, action) {
		this.actions_[name] = action;
	},
	
	get: function(type, options) {
		var input = null;
		if(type in this.actions_) {
			action = new this.actions_[type](options);
		}
		return action;
	}
};