var dius = {};

dius.buildlight = function() {
 
    var _tabGroup = Titanium.UI.createTabGroup();
    var _flexSpace = Titanium.UI.createButton({systemButton:Titanium.UI.iPhone.SystemButton.FLEXIBLE_SPACE});
    var _build_light_view;
    var _hostTextField;
	var _projectNameTextField;
	var _indicator;
    var _current_status;

    var success = Titanium.Filesystem.getFile(Titanium.Filesystem.resourcesDirectory,'success.mp3');
    var failure = Titanium.Filesystem.getFile(Titanium.Filesystem.resourcesDirectory,'failure.mp3');
    var sound_success = Titanium.Media.createSound({sound:success});
    var sound_failure = Titanium.Media.createSound({sound:failure});


    var db = {}
    
    db.init = function() {
    	var db = Titanium.Database.open('mydb');
		db.execute('CREATE TABLE IF NOT EXISTS BUILDLIGHT_CONFIG (ID TEXT, NAME TEXT)');
		var rows = db.execute('SELECT * FROM BUILDLIGHT_CONFIG');
		if (rows.getRowCount()===0) {
			Ti.API.debug("************ INSERTING into db the default config ***************");
			db.execute('INSERT INTO BUILDLIGHT_CONFIG (ID, NAME ) VALUES(?,?)','host','http://dc.dius.local:8080/jenkins');
			db.execute('INSERT INTO BUILDLIGHT_CONFIG (ID, NAME ) VALUES(?,?)','project_name','ExampleBuild');	
		}
		rows.close();
    	db.close();
    }
    
    db.config = function() {
    	var db = Titanium.Database.open('mydb');
    	var rows = db.execute('SELECT * FROM BUILDLIGHT_CONFIG');
		var config = {};
		while (rows.isValidRow()) {
			config[rows.field(0)] = rows.field(1);
			rows.next();
	    }
	    rows.close()
	    db.close()
	    return config
    }
    
    db.update = function(config) {
    	var db = Titanium.Database.open('mydb');
    	for (i in config) {
    		Ti.API.debug('key is: ' + config[i].name + ', value is: ' + config[i].value.value);
			db.execute('UPDATE BUILDLIGHT_CONFIG SET NAME = ? WHERE ID = ?', config[i].value.value, config[i].name);
		}
		db.close()
    }
    
    function _registerFailedCallback(e) {
	    Ti.API.debug(e.error);
	    var errorDialog = Titanium.UI.createAlertDialog({
	      title : "In a pickle",
	      message : "Failed to access Jenkins build " + e.error
	    });
	    errorDialog.show();
	}
    
    function _getJenkinsBuild(url, jenkins_callback) {
    	var xhr = Ti.Network.createHTTPClient({
      		onload : function(e) {
        		var parsedResponse = JSON.parse(this.responseText);
        		//Ti.API.debug(parsedResponse);
        		Ti.API.debug("_getJenkinsBuild.onload - Jenkins called");
        		jenkins_callback(parsedResponse);
        		//do something
      		},
      		onerror : _registerFailedCallback,
      		timeout : 10000
    	});
		Ti.API.debug("_getJenkinsBuild - calling url " + url);
    	xhr.open("GET", url );
    	xhr.setRequestHeader("Content-Type", "application/json");
    	xhr.setRequestHeader("Accept", "application/json");
    	xhr.send();
  	};
  

    function _createTabGroup() {
    	return _tabGroup;  	   	
    }
    
    function _createTab(window, title, icon) {
    	return Titanium.UI.createTab({  
		    icon: icon ? icon :'KS_nav_views.png',
		    title: title ? title : 'Unknown',
		    window:window
		});    	
    }
    
    function _createWindow(title, backgroundColor) {
    	return Titanium.UI.createWindow({  
    		title: title ? title : 'Build Light',
    		backgroundColor: backgroundColor? backgroundColor : '#fff'
		});
    }
    
    function _createLabel(text) { 
    	return Titanium.UI.createLabel({
			color:'#999',
			text: text ? text : 'Unknown',
			font:{fontSize:20,fontFamily:'Helvetica Neue'},
			textAlign:'center',
			width:'auto'
		});
    }
    
    function _createBuildLightView() {
		return Titanium.UI.createView({
			backgroundImage:'blue.png',
            height:256,
			width:256,
			top:20,
			transform:Titanium.UI.create2DMatrix().scale(0.4)
		});
    }
    
    function _createTextField(default_value, top) {
    	return Titanium.UI.createTextField({
			value: default_value ? default_value : 'Enter text',
			height:35,
			top: top ? top : 10,
			left:10,
			right:40,
			borderStyle:Titanium.UI.INPUT_BORDERSTYLE_ROUNDED
		});
	}
	
	function _createActivityIndicator() {
		return Titanium.UI.createActivityIndicator({
			bottom:10, 
			height:50,
			width:210,
			font:{fontFamily:'Helvetica Neue', fontSize:15,fontWeight:'bold'},
			color:'white',
			message:'Checking build status in..',
			style:Titanium.UI.iPhone.ActivityIndicatorStyle.PLAIN
		});
	}
	
	function _createSaveButton() {
		var save = Titanium.UI.createButton({
			systemButton:Titanium.UI.iPhone.SystemButton.SAVE
		});
		save.addEventListener('click', function() {
			Ti.API.debug("Saving...");
			Titanium.UI.createAlertDialog({title:'Save', message:'Configure changes have been saved'}).show();
			db.update(_textFieldsToSave);
		});
		return save;
	}
	
	function _alertDialog(title, message) {
		Titanium.UI.createAlertDialog({title:title, message:message}).show();
	}
	
	function _createCancelButton() {
		var cancel = Titanium.UI.createButton({
			systemButton:Titanium.UI.iPhone.SystemButton.CANCEL
		});
		cancel.addEventListener('click', function()
		{
			//_currentWindow().close();
			
		});
		return cancel;
	}
	
	function _currentWindow() {
		return Titanium.UI.currentWindow;
	}
	
	function _updateBuildLight() {
		Ti.API.debug("_updateBuildLight - Checking jenkins status");
		_getJenkinsBuild( _hostTextField.value + "/job/" + _projectNameTextField.value + "/api/json", _build_light_controller );
	}
	
	function _updateAnimation() {
        var animation = Titanium.UI.createAnimation();
		var t3 = Ti.UI.create2DMatrix();
		t3 = t3.rotate(180);
		t3 = t3.scale(1.3);
		animation.transform = t3;
		animation.duration = 3900;
        animation.repeat = 9;
		animation.autoreverse = true;
//		Ti.API.debug("Animation updated");
//        animation.addEventListener('complete',function() {
//            _updateBuildLight();
//             _build_light_view.animate(animation);
//        });
        _build_light_view.animate(animation);
	}
	
	function _build_light_controller(parsedResponse) {
		Ti.API.debug("Checking build status");
		if (parsedResponse.color==='disabled') {
			_build_light_view.backgroundImage = 'yellow.png';	
		} else if (parsedResponse.color==='blue') {
			_build_light_view.backgroundImage = 'green.png';
            if (_current_status!==undefined && _current_status!==parsedResponse.color) {
                _updateIndicator("Build success");
                sound_success.play();
            }

		} else if (parsedResponse.color==='red') {
			_build_light_view.backgroundImage = 'red.png';
            if (_current_status!==undefined && _current_status!==parsedResponse.color) {
                _updateIndicator("Build failure");
                sound_failure.play();
            }
		}
         _current_status=parsedResponse.color
		_updateIndicator(parsedResponse.healthReport[0].description.replace("Build stability:", ""));
        _updateAnimation()
	}
	
	function _updateIndicator(message, seconds) {
		if (Ti.Platform.name != 'android') {
			_indicator.show();
			_indicator.message  = message;
			if (seconds!==-1) {
				_hideIndicator(seconds);
			}
		}
	}
	
	function _hideIndicator(seconds) {
		setTimeout(function()
		{
			_indicator.hide();
		}, seconds ? seconds : 10000);
	}
	

    return {
        
        init : function() {
			// this sets the background color of the master UIView (when there are no windows/tab groups on it)
			db.init();
			Titanium.UI.setBackgroundColor('#000');
			var winBS = _createWindow("Build Status", '#13386c');
			_build_light_view = _createBuildLightView();
			winBS.add(_build_light_view);
			var winUsers = _createWindow("Users");
			var winConfig = _createWindow("Configure");
			var config = db.config();
			_hostTextField = _createTextField(config["host"], 10);
			_projectNameTextField = _createTextField(config["project_name"], 50);
			winConfig.add(_hostTextField);
			winConfig.add(_projectNameTextField);
			_textFieldsToSave = [{name:'host',value:_hostTextField},{name:'project_name',value:_projectNameTextField}]
			var save = _createSaveButton();
			winConfig.rightNavButton = _createSaveButton();
			winConfig.leftNavButton = _createCancelButton();
			_tabGroup.addTab(_createTab(winBS, "Build"));
			_tabGroup.addTab(_createTab(winUsers, "Users"));
			_tabGroup.addTab(_createTab(winConfig, "Config"));
			_indicator = _createActivityIndicator();
			if (Ti.Platform.name != 'android') {
				winBS.setToolbar([_indicator],{animated:false});
			}
			_tabGroup.open();
            _updateIndicator("Loading...");
            _updateAnimation();
            var countdownSeconds = setInterval(function() {
	            _updateBuildLight();
            },30000);
        }
        
    };
}();

dius.buildlight.init();

