requirejs.config({
    paths: {
        'bootstrap': 'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.0.0/js/bootstrap.bundle.min',
        'jquery': 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min'
    },
    shim: {
        'bootstrap': ['jquery'],
    }
});
require(['jquery', 'bootstrap', 'bundle'], function ($, bootstrap, bundle) {
    $('[data-toggle="popover"]').popover();
    require(["article"], function (article) { article.main(); console.log(article); });
});
