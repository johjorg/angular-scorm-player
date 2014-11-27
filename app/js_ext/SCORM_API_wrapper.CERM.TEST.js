/* jshint undef: true, unused: true */
/* jshint undef: false, unused: true */
/* =====================================================================================

 SCORM wrapper v1.1.7 by Philip Hutchison, May 2008 (http://pipwerks.com).

 Copyright (c) 2008 Philip Hutchison
 MIT-style license. Full license text can be found at
 http://www.opensource.org/licenses/mit-license.php

 This wrapper is designed to work with both SCORM 1.2 and SCORM 2004.

 Based on APIWrapper.js, created by the ADL and Concurrent Technologies
 Corporation, distributed by the ADL (http://www.adlnet.gov/scorm).

 SCORM.API.find() and SCORM.API.get() functions based on ADL code,
 modified by Mike Rustici (http://www.scorm.com/resources/apifinder/SCORMAPIFinder.htm),
 further modified by Philip Hutchison

 ======================================================================================== */
"use strict";
Object.size = function (obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      size += 1;
    }
  }
  return size;
};

var pipwerks = {}; //pipwerks 'namespace' helps ensure no conflicts with possible other "SCORM" variables
pipwerks.UTILS = {}; //For holding UTILS functions
pipwerks.testData = {}; //For holding test Data
pipwerks.debug = {
  isActive: true
}; //Enable (true) or disable (false) for debug mode

pipwerks.SCORM = { //Define the SCORM object
  version: null, //Store SCORM version.
  handleCompletionStatus: true, //Whether or not the wrapper should automatically handle the initial completion status
  handleExitMode: true, //Whether or not the wrapper should automatically handle the exit mode
  API: {
    handle: null,
    isFound: false
  }, //Create API child object
  connection: {
    isActive: false
  }, //Create connection child object
  data: {
    completionStatus: null,
    exitStatus: null
  }, //Create data child object
  debug: {} //Create debug child object
};

pipwerks.ref = function (obj, str) {
  //console.log('pipwerks.ref: ' + str + ' obj:' + JSON.stringify(obj));
  str = str.split(".");
  for (var i = 0; i < str.length; i += 1) {
    obj = obj[str[i]];
  }
  return obj;
};
pipwerks.setData = function (key, val, obj) {
  //console.log('pipwerks.setData: key:' + key + ' val:' + val);
  var ka = key.split(/\./); //split the key by the dots
  if (ka.length < 2) {
    obj[ka[0]] = val; //only one part (no dots) in key, just set value
  } else {
    if (!obj[ka[0]]) {
      obj[ka[0]] = {};
    } //create our "new" base obj if it doesn't exist
    obj = obj[ka.shift()]; //remove the new "base" obj from string array, and hold actual object for recursive call
    pipwerks.setData(ka.join("."), val, obj); //join the remaining parts back up with dots, and recursively set data on our new "base" obj
  }
};

/* --------------------------------------------------------------------------------
 pipwerks.SCORM.isAvailable
 A simple function to allow Flash ExternalInterface to confirm
 presence of JS wrapper before attempting any LMS communication.

 Parameters: none
 Returns:    Boolean (true)
 ----------------------------------------------------------------------------------- */

pipwerks.SCORM.isAvailable = function () {
  return true;
};

// ------------------------------------------------------------------------- //
// --- SCORM.API functions ------------------------------------------------- //
// ------------------------------------------------------------------------- //

/* -------------------------------------------------------------------------
 pipwerks.SCORM.API.find(window)
 Looks for an object named API in parent and opener windows

 Parameters: window (the browser window object).
 Returns:    Object if API is found, null if no API found
 ---------------------------------------------------------------------------- */

pipwerks.SCORM.API.find = function (win) {

  var API = null,
    findAttempts = 0,
    findAttemptLimit = 500,
    traceMsgPrefix = "SCORM.API.find",
    trace = pipwerks.UTILS.trace,
    scorm = pipwerks.SCORM;

  while ((!win.API && !win.API_1484_11) &&
  (win.parent) &&
  (win.parent != win) &&
  (findAttempts <= findAttemptLimit)) {

    findAttempts++;
    win = win.parent;

  }

  if (scorm.version) { //If SCORM version is specified by user, look for specific API

    switch (scorm.version) {

      case "2004":

        if (win.API_1484_11) {

          API = win.API_1484_11;

        } else {

          trace(traceMsgPrefix + ": SCORM version 2004 was specified by user, but API_1484_11 cannot be found.");

        }

        break;

      case "1.2":

        if (win.API) {

          API = win.API;

        } else {

          trace(traceMsgPrefix + ": SCORM version 1.2 was specified by user, but API cannot be found.");

        }

        break;

    }

  } else { //If SCORM version not specified by user, look for APIs

    if (win.API_1484_11) { //SCORM 2004-specific API.

      scorm.version = "2004"; //Set version
      API = win.API_1484_11;

    } else if (win.API) { //SCORM 1.2-specific API

      scorm.version = "1.2"; //Set version
      API = win.API;

    }

  }

  if (API) {

    trace(traceMsgPrefix + ": API found. Version: " + scorm.version);
    trace("API: " + API);

  } else {

    trace(traceMsgPrefix + ": Error finding API. \nFind attempts: " + findAttempts + ". \nFind attempt limit: " + findAttemptLimit);

  }

  return API;

};

/* -------------------------------------------------------------------------
 pipwerks.SCORM.API.get()
 Looks for an object named API, first in the current window's frame
 hierarchy and then, if necessary, in the current window's opener window
 hierarchy (if there is an opener window).

 Parameters:  None.
 Returns:     Object if API found, null if no API found
 ---------------------------------------------------------------------------- */

pipwerks.SCORM.API.get = function () {

  var API = null,
    win = window,
    find = pipwerks.SCORM.API.find,
    trace = pipwerks.UTILS.trace;

  if (win.parent && win.parent != win) {

    API = find(win.parent);

  }

  if (!API && win.top.opener) {

    API = find(win.top.opener);

  }

  if (API) {

    pipwerks.SCORM.API.isFound = true;

  } else {

    trace("API.get failed: Can't find the API!");

  }

  return API;

};

/* -------------------------------------------------------------------------
 pipwerks.SCORM.API.getHandle()
 Returns the handle to API object if it was previously set

 Parameters:  None.
 Returns:     Object (the pipwerks.SCORM.API.handle variable).
 ---------------------------------------------------------------------------- */

pipwerks.SCORM.API.getHandle = function () {

  var API = pipwerks.SCORM.API;

  if (!API.handle && !API.isFound) {

    API.handle = API.get();

  }

  return API.handle;

};

// ------------------------------------------------------------------------- //
// --- pipwerks.SCORM.connection functions --------------------------------- //
// ------------------------------------------------------------------------- //

/* -------------------------------------------------------------------------
 pipwerks.SCORM.connection.initialize()
 Tells the LMS to initiate the communication session.

 Parameters:  None
 Returns:     Boolean
 ---------------------------------------------------------------------------- */

pipwerks.SCORM.connection.initialize = function () {
  //localStorage.clear();
  var defaultScormData = {
    "cmi": {
      "learner_id": "johajo",
      "learner_name": "Johs Jørgensen",
      "completion_status": "not attempted",
      "success_status": "unknown",
      "entry": "ab-initio",
      "credit": "credit",
      "location": "",
      "scaled_passing_score": 0.8
    }
  };
  var localdata = JSON.parse(localStorage.getItem('scormData'));
  //console.log('localdata' + localdata);
  pipwerks.testData = localdata || defaultScormData;
  //console.log('##########\nscormData: ' + JSON.stringify(pipwerks.testData, undefined, 4) + '\n##########');

  return true;

};

/* -------------------------------------------------------------------------
 pipwerks.SCORM.connection.terminate()
 Tells the LMS to terminate the communication session

 Parameters:  None
 Returns:     Boolean
 ---------------------------------------------------------------------------- */

pipwerks.SCORM.connection.terminate = function () {

  var success = false,
    scorm = pipwerks.SCORM,
    exitStatus = pipwerks.SCORM.data.exitStatus,
    completionStatus = pipwerks.SCORM.data.completionStatus,
    trace = pipwerks.UTILS.trace,
    makeBoolean = pipwerks.UTILS.StringToBoolean,
    debug = pipwerks.SCORM.debug,
    traceMsgPrefix = "SCORM.connection.terminate ";

  if (scorm.connection.isActive) {

    var API = scorm.API.getHandle(),
      errorCode = 0;

    if (API) {

      if (scorm.handleExitMode && !exitStatus) {

        if (completionStatus !== "completed" && completionStatus !== "passed") {

          switch (scorm.version) {
            case "1.2":
              success = scorm.set("cmi.core.exit", "suspend");
              break;
            case "2004":
              success = scorm.set("cmi.exit", "suspend");
              break;
          }

        } else {

          switch (scorm.version) {
            case "1.2":
              success = scorm.set("cmi.core.exit", "logout");
              break;
            case "2004":
              success = scorm.set("cmi.exit", "normal");
              break;
          }

        }

      }

      switch (scorm.version) {
        case "1.2":
          success = makeBoolean(API.LMSFinish(""));
          break;
        case "2004":
          success = makeBoolean(API.Terminate(""));
          break;
      }

      if (success) {

        scorm.connection.isActive = false;

      } else {

        errorCode = debug.getCode();
        trace(traceMsgPrefix + "failed. \nError code: " + errorCode + " \nError info: " + debug.getInfo(errorCode));

      }

    } else {

      trace(traceMsgPrefix + "failed: API is null.");

    }

  } else {

    trace(traceMsgPrefix + "aborted: Connection already terminated.");

  }

  return success;

};

// ------------------------------------------------------------------------- //
// --- pipwerks.SCORM.data functions --------------------------------------- //
// ------------------------------------------------------------------------- //

/* -------------------------------------------------------------------------
 pipwerks.SCORM.data.get(parameter)
 Requests information from the LMS.

 Parameter: parameter (string, name of the SCORM data model element)
 Returns:   string (the value of the specified data model element)
 ---------------------------------------------------------------------------- */

pipwerks.SCORM.data.get = function (parameter) {
  var val2get;
  switch (parameter) {
    case "cmi.interactions._count":
      val2get = Object.size(pipwerks.ref(pipwerks.testData, 'cmi.interactions'));
      break;
    default :
      val2get = pipwerks.ref(pipwerks.testData, parameter);
      break;
  }

  return String(val2get);

};

/* -------------------------------------------------------------------------
 pipwerks.SCORM.data.set()
 Tells the LMS to assign the value to the named data model element.
 Also stores the SCO's completion status in a variable named
 pipwerks.SCORM.data.completionStatus. This variable is checked whenever
 pipwerks.SCORM.connection.terminate() is invoked.

 Parameters: parameter (string). The data model element
 value (string). The value for the data model element
 Returns:    Boolean
 ---------------------------------------------------------------------------- */

pipwerks.SCORM.data.set = function (parameter, value) {
  //console.log('pipwerks.SCORM.data.set: ' + parameter + ' , ' + value);
  pipwerks.setData(parameter, value, pipwerks.testData);
  //console.log('AFTER pipwerks.testData: ' + JSON.stringify(pipwerks.testData, undefined, 4) + '\n');
  return true;

};

/* -------------------------------------------------------------------------
 pipwerks.SCORM.data.save()
 Instructs the LMS to persist all data to this point in the session

 Parameters: None
 Returns:    Boolean
 ---------------------------------------------------------------------------- */

pipwerks.SCORM.data.save = function () {

  var success = false,
    scorm = pipwerks.SCORM,
    trace = pipwerks.UTILS.trace,
    makeBoolean = pipwerks.UTILS.StringToBoolean,
    traceMsgPrefix = "SCORM.data.save failed";

  if (scorm.connection.isActive) {

    var API = scorm.API.getHandle();

    if (API) {

      switch (scorm.version) {
        case "1.2":
          success = makeBoolean(API.LMSCommit(""));
          break;
        case "2004":
          success = makeBoolean(API.Commit(""));
          break;
      }

    } else {

      trace(traceMsgPrefix + ": API is null.");

    }

  } else {
    //trace("save tolocalStorage: "+JSON.stringify(pipwerks.testData));
    window.localStorage.setItem('scormData', JSON.stringify(pipwerks.testData));
  }

  return success;

};

pipwerks.SCORM.status = function (action, status) {

  var success = false,
    scorm = pipwerks.SCORM,
    trace = pipwerks.UTILS.trace,
    traceMsgPrefix = "SCORM.getStatus failed",
    cmi = "";

  if (action !== null) {

    switch (scorm.version) {
      case "1.2":
        cmi = "cmi.core.lesson_status";
        break;
      case "2004":
        cmi = "cmi.completion_status";
        break;
    }

    switch (action) {

      case "get":
        success = pipwerks.SCORM.data.get(cmi);
        break;

      case "set":
        if (status !== null) {

          success = pipwerks.SCORM.data.set(cmi, status);

        } else {

          success = false;
          trace(traceMsgPrefix + ": status was not specified.");

        }

        break;

      default:
        success = false;
        trace(traceMsgPrefix + ": no valid action was specified.");

    }

  } else {

    trace(traceMsgPrefix + ": action was not specified.");

  }

  return success;

};

// ------------------------------------------------------------------------- //
// --- pipwerks.SCORM.debug functions -------------------------------------- //
// ------------------------------------------------------------------------- //

/* -------------------------------------------------------------------------
 pipwerks.SCORM.debug.getCode
 Requests the error code for the current error state from the LMS

 Parameters: None
 Returns:    Integer (the last error code).
 ---------------------------------------------------------------------------- */

pipwerks.SCORM.debug.getCode = function () {

  var API = pipwerks.SCORM.API.getHandle(),
    scorm = pipwerks.SCORM,
    trace = pipwerks.UTILS.trace,
    code = 0;

  if (API) {

    switch (scorm.version) {
      case "1.2":
        code = parseInt(API.LMSGetLastError(), 10);
        break;
      case "2004":
        code = parseInt(API.GetLastError(), 10);
        break;
    }

  } else {

    trace("SCORM.debug.getCode failed: API is null.");

  }

  return code;

};

/* -------------------------------------------------------------------------
 pipwerks.SCORM.debug.getInfo()
 "Used by a SCO to request the textual description for the error code
 specified by the value of [errorCode]."

 Parameters: errorCode (integer).
 Returns:    String.
 ----------------------------------------------------------------------------- */

pipwerks.SCORM.debug.getInfo = function (errorCode) {

  var API = pipwerks.SCORM.API.getHandle(),
    scorm = pipwerks.SCORM,
    trace = pipwerks.UTILS.trace,
    result = "";

  if (API) {

    switch (scorm.version) {
      case "1.2":
        result = API.LMSGetErrorString(errorCode.toString());
        break;
      case "2004":
        result = API.GetErrorString(errorCode.toString());
        break;
    }

  } else {

    trace("SCORM.debug.getInfo failed: API is null.");

  }

  return String(result);

};

/* -------------------------------------------------------------------------
 pipwerks.SCORM.debug.getDiagnosticInfo
 "Exists for LMS specific use. It allows the LMS to define additional
 diagnostic information through the API Instance."

 Parameters: errorCode (integer).
 Returns:    String (Additional diagnostic information about the given error code).
 ---------------------------------------------------------------------------- */

pipwerks.SCORM.debug.getDiagnosticInfo = function (errorCode) {

  var API = pipwerks.SCORM.API.getHandle(),
    scorm = pipwerks.SCORM,
    trace = pipwerks.UTILS.trace,
    result = "";

  if (API) {

    switch (scorm.version) {
      case "1.2":
        result = API.LMSGetDiagnostic(errorCode);
        break;
      case "2004":
        result = API.GetDiagnostic(errorCode);
        break;
    }

  } else {

    trace("SCORM.debug.getDiagnosticInfo failed: API is null.");

  }

  return String(result);

};

// ------------------------------------------------------------------------- //
// --- Shortcuts! ---------------------------------------------------------- //
// ------------------------------------------------------------------------- //

// Because nobody likes typing verbose code.

pipwerks.SCORM.init = pipwerks.SCORM.connection.initialize;
pipwerks.SCORM.get = pipwerks.SCORM.data.get;
pipwerks.SCORM.set = pipwerks.SCORM.data.set;
pipwerks.SCORM.save = pipwerks.SCORM.data.save;
pipwerks.SCORM.quit = pipwerks.SCORM.connection.terminate;

// ------------------------------------------------------------------------- //
// --- pipwerks.UTILS functions -------------------------------------------- //
// ------------------------------------------------------------------------- //

/* -------------------------------------------------------------------------
 pipwerks.UTILS.StringToBoolean()
 Converts 'boolean strings' into actual valid booleans.

 (Most values returned from the API are the strings "true" and "false".)

 Parameters: String
 Returns:    Boolean
 ---------------------------------------------------------------------------- */

pipwerks.UTILS.StringToBoolean = function (string) {
  switch (string.toLowerCase()) {
    case "true":
    case "yes":
    case "1":
      return true;
    case "false":
    case "no":
    case "0":
    case null:
      return false;
    default:
      return Boolean(string);
  }
};

/* -------------------------------------------------------------------------
 pipwerks.UTILS.trace()
 Displays error messages when in debug mode.

 Parameters: msg (string)
 Return:     None
 ---------------------------------------------------------------------------- */

pipwerks.UTILS.trace = function (msg) {

  if (pipwerks.debug.isActive) {

    //Firefox users can use the 'Firebug' extension's console.
    if (window.console) {
      console.log(msg);
    }
    /*else {
     alert(msg);
     }*/

  }
};
