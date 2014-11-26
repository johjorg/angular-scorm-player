'use strict';

/* Directives */

app.directive("mainpage", function(){
    return {
        templateUrl:"partials/base.html"
    }
});

app.directive("main", function () {
    return {
        templateUrl: "partials/main.html"
    }
});
app.directive("scormdata", function () {
    return {
        templateUrl: "partials/scormData.html"
    }
});
app.directive("footer", function () {
    return {
        templateUrl: "partials/footer.html"
    }
});
app.directive("header", function () {
    return {
        templateUrl: "partials/header.html"
    }
});
