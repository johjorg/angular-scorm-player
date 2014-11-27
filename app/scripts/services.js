/* global scorm */
'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.

var appServices = angular.module('appServices', ['ngResource']);

appServices.factory('MenuFetch', ['$resource',
  function ($resource) {
    return $resource('data/:menuId.json', {}, {
      query: {method: 'GET', params: {menuId: 'menuAll'}, isArray: false}
    });
  }]);
appServices.factory('SharedFunctions', [
  function () {
    var sFunctions = {};
    sFunctions.cleanArray = function (mArray) {
      return mArray.filter(function (val) {
        return !(val === "" || typeof val === "undefined" || val === null || val === "undefined");
      });
    };
    return sFunctions;
  }
]);

appServices.factory("CourseModel", ['$filter', 'MenuFetch', function ($filter, MenuFetch) {

  var qData = {};
  qData.currentQObject = null;
  qData.menuData = {};
  qData.menuData.menuItems = [];
  qData.enableEvalBtn = false;
  qData.scoreMax = 0;
  qData.setCurrentQObject = function (qObj) {

    qData.currentQObject = qObj;
    //console.log('#####currentQObject SET');
  };
  qData.getNavObjById = function (iId) {
    return $filter('filter')(qData.menuData.menuItems, {id: iId})[0];
  };
  qData.navigate = function (step) {
    //console.log('qData.navigate: ' + step);

    qData.setSelectedItem(qData.menuData.menuItems[qData.menuData.currentIndex + step]);
  };
  qData.setSelectedItem = function (menuItem) {
    //console.log('CourseModel setSelectedItem: ' + menuItem.header);
    qData.enableEvalBtn = false;
    qData.menuData.currentIndex = qData.menuData.menuItems.indexOf(menuItem);
    qData.menuData.ancestorsArray = getAncestorsArray(menuItem.id);
    qData.menuData.selectedId = menuItem.id;
    qData.menuData.contentUrl = menuItem.contentUrl;
    qData.menuData.weighting = menuItem.weighting;
    qData.menuData.isfirst = (qData.menuData.currentIndex === 0);
    qData.menuData.islast = (qData.menuData.currentIndex === qData.menuData.menuItems.length - 1);
    qData.qContent = MenuFetch.get({menuId: menuItem.contentUrl}, function (qContent) {
      qData.setCurrentQObject(qContent);
    });
    qData.scormCmiIAIindex = getCmiIaIIndex(qData.menuData.selectedId);
    //console.log("scormCmiIAIindex: " + qData.scormCmiIAIindex + ' num IAs: ' + scorm.get("cmi.interactions._count"));
    if (qData.scormCmiIAIindex > scorm.get("cmi.interactions._count") - 1) {
      //console.log('SAVE SCORM');
      scorm.set("cmi.interactions." + qData.scormCmiIAIindex + ".id", qData.menuData.selectedId);
    } else {
      //console.log('NOT SAVE SCORM');
    }
    scorm.set('cmi.location', qData.menuData.selectedId);
    scorm.save();
  };
  qData.getLearnerResponse = function () {
    //console.log("##getLearnerResponse: " + scorm.get("cmi.interactions." + qData.scormCmiIAIindex + ".learner_response"))
    var lResponse = scorm.get("cmi.interactions." + qData.scormCmiIAIindex + ".learner_response");
    return (lResponse === undefined) ? [] : lResponse.split(",");
  };
  qData.getCurrentScormData = function (dataName) {
    return scorm.get("cmi.interactions." + qData.scormCmiIAIindex + "." + dataName);
  };
  qData.setCurrentScormData = function (dataName, dataVal) {
    scorm.set("cmi.interactions." + qData.scormCmiIAIindex + "." + dataName, dataVal);
    scorm.save();
  };
  qData.setScoreRaw = function () {
    var i,
      numOfIa = parseInt(scorm.get("cmi.interactions._count"), 10),
      totalScore = 0;

    for (i = 0; i < numOfIa; i += 1) {
      //console.log("i:" + i + ' scorm.get("cmi.interactions."' + i + '".id")' + scorm.get("cmi.interactions." + i + ".id"));
      if (scorm.get("cmi.interactions." + i + ".result") === "correct") {
        totalScore += parseInt(scorm.get("cmi.interactions." + i + ".score.raw"), 10);
      }
    }
    scorm.set("cmi.score.raw", totalScore);
  };
  qData.saveInitialScormData = function () {
    scorm.set("cmi.score.max", qData.scoreMax);
    scorm.set("cmi.score.min", 0);
    scorm.save();
  };
  var getCmiIaIIndex = function (iaId) {
    var i,
      numOfIa = parseInt(scorm.get("cmi.interactions._count"), 10),
      foundIndex;
    //console.log("model.getIaIndexScorm numOfIa: " + numOfIa + ' iaId: ' + iaId);
    if (numOfIa === 0) {
      foundIndex = 0;
    } else {
      for (i = 0; i < numOfIa; i += 1) {
        //console.log("i:" + i + ' scorm.get("cmi.interactions."' + i + '".id")' + scorm.get("cmi.interactions." + i + ".id"));
        if (scorm.get("cmi.interactions." + i + ".id") === iaId) {
          //console.log("hit!! cmi.interactions." + i);
          foundIndex = i;
          break;
        }
      }
      //console.log("foundIndex pre: " + foundIndex + " i:" + i);
      foundIndex = (foundIndex === undefined || i === 0) ? i : foundIndex;
    }

    //console.log("foundIndex return: " + foundIndex);
    return foundIndex;

  };
  var getAncestorsArray = function (selId) {
    var returnArray = [];
    returnArray.push(selId);
    var parentId = qData.getNavObjById(selId).parentId;
    returnArray.push(parentId);
    ////console.log('parentId: ' + parentId);
    while (parentId !== "0") {
      parentId = qData.getNavObjById(parentId).parentId;
      returnArray.push(parentId);
    }
    return returnArray;

  };
  return qData;

}]);


