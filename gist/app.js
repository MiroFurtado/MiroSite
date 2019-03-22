(window => {
    "use strict";

    /**
     * GitHub API wrapper
     */
    const GithubApi = {
        xhr: null,
        apiBaseUrl: 'https://api.github.com',
        githubStatusApiUrl: 'https://kctbh9vrtdwd.statuspage.io/api/v2/summary.json', // https://www.githubstatus.com/api
        getXMLHttpRequest: function() {
            if (!!window.XMLHttpRequest) {
                this.xhr = new window.XMLHttpRequest;
            } else {
                try {
                    this.xhr = new ActiveXObject('MSXML2.XMLHTTP.3.0');
                } catch (e) {
                    this.xhr = null;
                }
            }
        },
        get: function(requestUrl, success, failure) {
            this.getXMLHttpRequest();

            if (!this.xhr) {
                window.console.log('AJAX (XMLHTTP) not supported by your client.');
                failure({
                    status: 'error',
                    msg: 'AJAX (XMLHTTP) not supported by your client but required for Nicegist to work, sorry.'
                });
                return;
            }

            const self = this.xhr;

            this.xhr.open('GET', requestUrl, true);
            this.xhr.setRequestHeader('Accept', 'application/json');
            this.xhr.timeout = 1500; // time in milliseconds

            self.onload = _ => {
                if (self.status >= 200 && self.status < 300) {
                    window.console.log(`Successfully called ${requestUrl}.`);
                    try {
                        var json = JSON.parse(self.responseText);
                    } catch (e) {
                        window.console.log('Error parsing response as JSON. Returning raw response data.');
                    }

                    success((!json ? self.responseText : json));
                }
                else {
                    window.console.log(`Error requesting ${requestUrl}. Response Status-Code is ${self.status}.`);
                    let msg = self.status === 404
                        ? 'Invalid id? Gist API said "not found".'
                        : `Error when fetching Gist. Gist API returned a ${self.status} response code.`
                    failure({
                        status: 'error',
                        msg: msg
                    });
                }
            }
            self.onerror = _ => {
                window.console.log(`There was an error (of some sort) connecting to ${requestUrl}.`);
                failure({
                    status: 'error',
                    msg: 'Error when fetching Gist. Please try to reload.'
                });
            };
            self.ontimeout = _ => {
                window.console.log(`Connection to ${requestUrl} timed out.`);
                if (requestUrl !== this.githubStatusApiUrl) {
                    this.getGithubApiStatus(response => {
                        if (response && response.components) {
                            for (let i in response.components) {
                                // brv1bkgrwx7q = id for "GitHub APIs" component
                                if (response.components[i].id === 'brv1bkgrwx7q' && response.components[i].status !== 'operational') {
                                    failure({
                                        status: 'error',
                                        msg: 'The GitHub API is currently not fully operational. Sorry, but nothing we can do right now. Please check back later.'
                                    });
                                }
                            }
                            failure({
                                status: 'error',
                                msg: 'API timeout error when fetching Gist. Please try to reload.'
                            });
                        } else {
                            failure({
                                status: 'error',
                                msg: 'API timeout error when fetching Gist. Please try to reload.'
                            });
                        }
                    }, error => {
                        failure({
                            status: 'error',
                            msg: 'API timeout error when fetching Gist. Please try to reload.'
                        });
                    });
                } else {
                    failure({
                        status: 'error',
                        msg: 'API timeout error when fetching Gist AND when fetching the GitHub API status. Please try to reload or check back later.'
                    });
                }
            };

            this.xhr.send();
        },
        getGist: function(gistId, success, failure) {
            this.get(`${this.apiBaseUrl}/gists/${gistId}`, success, failure);
        },
        getUserGists: function(username, success, failure) {
            this.get(`${this.apiBaseUrl}/users/${username}/gists`, success, failure);
        },
        getGithubApiStatus: function(success, failure) {
            this.get(this.githubStatusApiUrl, success, failure);
        }
    };

    window.GithubApi = GithubApi;
})(window);

((window, document) => {
    "use strict";

    /**
     * Nicegist helper functions
     */

    // querySelector shortcut
    const $ = selector => {
        return document.querySelector(selector);
    };

    // detect support for the behavior property in ScrollOptions
    const supportsNativeSmoothScroll = 'scrollBehavior' in document.documentElement.style ? true : false;

    // native smooth scrolling for Chrome, Firefox & Opera
    // @see: https://caniuse.com/#feat=css-scroll-behavior
    const nativeSmoothScrollTo = elem => {
        window.scroll({
            behavior: 'smooth',
            left: 0,
            top: elem.getBoundingClientRect().top + window.pageYOffset
        });
    };

    // polyfilled smooth scrolling for IE, Edge & Safari
    const smoothScrollTo = (to, duration) => {
        const element = document.scrollingElement || document.documentElement,
            start = element.scrollTop,
            change = to - start,
            startDate = +new Date();

        // t = current time
        // b = start value
        // c = change in value
        // d = duration
        const easeInOutQuad = (t, b, c, d) => {
            t /= d/2;
            if (t < 1) return c/2*t*t + b;
            t--;
            return -c/2 * (t*(t-2) - 1) + b;
        };

        const animateScroll = _ => {
            const currentDate = +new Date();
            const currentTime = currentDate - startDate;
            element.scrollTop = parseInt(easeInOutQuad(currentTime, start, change, duration));
            if(currentTime < duration) {
                requestAnimationFrame(animateScroll);
            }
            else {
                element.scrollTop = to;
            }
        };
        animateScroll();
    };

    // smooth scrolling stub
    const scrollToElem = elemSelector => {
        if (!elemSelector) {
            return;
        }

        let elem = $(elemSelector);
        if (elem) {
            if (supportsNativeSmoothScroll) {
                nativeSmoothScrollTo(elem);
            } else {
                smoothScrollTo(elem.offsetTop, 600);
            }
        }
    };

    /**
     * Nicegist - with modifications by Miro Furtado 3/21/19
     */
    const Nicegist = {
        gist: null,
        thisScript: null,
        files: {
            markdown: [],
            others: []
        },
        isHomepage: false,
        init: function() {
            let gistId = '';

            // get the gist id
            const redirect = window.sessionStorage.redirect;
            delete window.sessionStorage.redirect;
            this.thisScript = document.currentScript; //store tag location
            gistId = document.currentScript.getAttribute('gist');
            const home = document.currentScript.getAttribute('home');
            
            if (home != null) {
                const index = document.currentScript.getAttribute('index');
                this.isHomepage = true;
                this.loadGistList('MiroFurtado', index);
            } else {
                this.loadGist(gistId);
            }
        },
        finish: function() {
            // add syntax highlighting to code blocks
            const codeBlocks = document.querySelectorAll('pre');
            for (let c in codeBlocks) {
                try {
                    hljs.highlightBlock(codeBlocks[c]);
                } catch(e) {}
            }

            // open external links in new tab and
            // attach smooth scrolling to internal anchor links
            setTimeout(_ => {
                for (let c = document.getElementsByTagName('a'), i = 0; i < c.length; i++) {
                    const a = c[i];
                    if (a.getAttribute('href') && a.hash && a.hash.length && a.hash[0] === '#' && a.hostname === window.location.hostname) {
                        a.addEventListener('click', function(e) {
                            // e.preventDefault();
                            const elem = e.target.nodeName === 'A' ? e.target : e.target.parentNode;
                            if (elem.hash) {
                                scrollToElem(elem.hash);
                                window.history.pushState(null, null, elem.hash);
                            }
                        });
                    } else if (a.getAttribute('href') && a.hostname !== window.location.hostname) {
                        a.target = '_blank';
                    }
                }
            }, 500);

            MathJax.Hub.Queue(["Typeset", MathJax.Hub]);

            // smooth-scroll to anchor, if present in request URL
            // if (window.location.hash.length) {
            //     setTimeout(scrollToElem(window.location.hash), 500);
            // }
        },
        loadGistList: function(username, i) {
            GithubApi.getUserGists(username, gists => {
                var gist = gists[i];
                gist.description = gist.description.split('::');
                var $titleHolder =  $('#index'+i);
                var gist_json = JSON.parse(gist.description[1]);
                document.title = gist_json.title;
                $titleHolder.textContent = gist_json.title;
                $titleHolder.setAttribute("href", "gist.htm#"+gist.id);
            }, error => {
                console.warn(error);
            });
        },
        loadGist: function(gistId) {
            if(!this.isHomepage) {
                 gistId = window.location.hash.substr(1);
                 var $titleHolder =  $('#titleHolder');
            } else {
                var $titleHolder =  $('#'+gistId); 
            }
            const $contentHolder = $('#gistContent');

            const hideLoadingIndicator = _ => {
                $('#loadingIndicator').style.display = 'none';
            };

            // Since we can not access the iframe to get its scroll height (cross origin),
            // we calculate the height by counting the lines in the embedded gist.
            // Ugly, but works (mostly) reliable.
            const getIframeHeight = filename => {
                for (let i in this.files.others) {
                    if (this.files.others[i].filename === filename) {
                        const matches = this.files.others[i].content.match(/\n/g);
                        const lines = ((matches && matches.length) ? matches.length : 0) + 1;
                        // 22px = line height in embedded gists (with .pibb extension)
                        // 40px = embedded gists footer height
                        // 3px = cumulated border height for embedded gists
                        // 8px = body margin for embedded gists
                        return (lines * 22) + 40 + 3 + 8;
                    }
                }
                return false;
            };

            // (try to) load the given gist from the GitHub Gist API
            GithubApi.getGist(gistId, gist => {
                if (gist) {
                    this.gist = gist;
                    console.dir(gist);
                    hideLoadingIndicator();

                    if (gist.id && gist.id.length) {
                        // use gist description as a document title / headline
                        if (gist.description.length) {
                            gist.description = gist.description.split('::');
                            if(gist.description.length == 1) {
                                $titleHolder.textContent = gist.description[0];
                                document.title = gist.description[0];
                            } else {
                                var gist_json = JSON.parse(gist.description[1]);
                                document.title = gist_json.title;
                                $titleHolder.textContent = gist_json.title;
                                if(!this.isHomepage) {
                                    var script = document.createElement('script');
                                    script.src = "https://utteranc.es/client.js";
                                    script.setAttribute("repo", "mirofurtado/mirofurtado.github.io")
                                    script.setAttribute("issue-term", gist_json.title);
                                    script.setAttribute("theme", "github-dark-orange");
                                    script.setAttribute("async", "");
                                    this.thisScript.parentNode.insertBefore(script, this.thisScript);
                                }
                                if(gist_json.icon) {
                                    $('#gistIcon').setAttribute("class", gist_json.icon);
                                }
                                
                                $('#gistCategory').innerHTML = gist_json.subject;
                            }
                        } else {
                            $titleHolder.textContent = 'Untitled document';
                        }

                        // get all markdown files to be parsed
                        for (let n in gist.files) {
                            if (gist.files[n].language === 'Markdown') {
                                this.files.markdown.push(gist.files[n]);
                            } else {
                                this.files.others.push(gist.files[n]);
                            }
                        }

                        // parse markdown files
                        if (this.files.markdown.length) {
                            let html = '';

                            try {
                                // (try to) init markdown-it parser library
                                var md = window.markdownit({linkify: true});
                            } catch(e) {}

                            if (!md) {
                                $titleHolder.textContent = 'Markdown-parser error, please try to reload.';
                                return;
                            }

                            // configure the markdown-it-anchor plugin (for this parser instance)
                            md.use(window.markdownItAnchor, {
                                level: 1,
                                permalink: true,
                                permalinkClass: 'header-anchor',
                                permalinkSymbol: '#',
                                permalinkBefore: true,
                                slugify: str => {
                                    // use custom slugify function, which reassembles the GitHub way of creating anchors
                                    str = encodeURIComponent(String(str).trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-'));
                                    if (/[0-9]/.test(str[0])) { // ids must not start with a number
                                        str = str.substring((str.split('-', 1)[0].length + 1));
                                    }
                                    if (str.substr(-1) === '-') { // ids must not end with a dash ("-")
                                        str = str.slice(0, -1);
                                    }
                                    return gistId;
                                }
                            });

                            // render markdown
                            this.files.markdown.forEach(file => {
                                html += md.render(file.content);
                            });

                            // replace custom embed tags (Nicegist-specific feature)
                            html = html.replace(/&lt;gist&gt;(.*?)&lt;\/gist&gt;/gi, match => {
                                const filename = match.replace(/&lt;\/?gist&gt;/g, '');
                                const height = getIframeHeight(filename);
                                return !height ? match : `<iframe class='embedded-gist' style='height:${height}px' src='https://gist.github.com/${gistId}.pibb?file=${filename}' scrolling='no'></iframe>`;
                            });

                            // write content HTML
                            if(!this.isHomepage) {
                                $contentHolder.innerHTML = html;
                            }

                            // add author details
                            if (!this.isHomepage) {
                                const username = !gist.owner ? 'ghost' : gist.owner.login; // when a gist user was deleted, github uses a "ghost" label
                                const avatar = !gist.owner ? 'https://avatars3.githubusercontent.com/u/10137' : gist.owner.avatar_url;
                                const gistAuthor = !gist.owner ? `<span class='username'>${username}</span>` : `<a href='${gist.owner.html_url}' class='username'>${username}</a>`;
                                $('#gistAuthor').innerHTML = gistAuthor;
                                $('#gistPubDate').innerHTML = `<a href='${gist.html_url}'>${gist.created_at}</a>`;
                                // $('#authorAvatar').innerHTML = `<img class='avatar' height='26' width='26' alt='@${username}' src='${avatar}?s=24&amp;v=4'>`;
                                // $('#authorHolder').style.display = 'block';
                            }
                            this.finish();
                        } else {
                            $contentHolder.textContent = `No markdown files attached to gist ${gistId}.`;
                        }
                    }
                }
            }, error => {
                console.warn(error);
                hideLoadingIndicator();

                // if loading the gist from GitHub API fails, display a helpful error message
                $titleHolder.textContent = error.msg;
            });
        }
    };

    window.onhashchange = function(e) {
        e.preventDefault();
        scrollToElem(location.hash);
    };

    window.Nicegist = Nicegist;
})(window, document);

(_ => {
    Nicegist.init();
})();
