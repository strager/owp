<?php

class components_blog extends owpcomponent {
    protected $templates;

    protected $forumId;

    function __construct(k_TemplateFactory $templates) {
        $this->templates = $templates;

        $this->forumId = 1;
    }

    function dispatch() {
        $alias = $this->checkAlias($this->subspace());
        if ($alias) {
            return $alias;
        }

        return parent::dispatch();
    }

    function checkAlias($path) {
        // Aliases so old site's URL's still work

        $aliases = array(
            'articles/15/weekend-agenda-3-results' => 15,
            'articles/14/weekend-agenda-3' => 14,
            'articles/13/owp-status-update-1' => 13,
            'articles/12/weekend-agenda-2-results' => 12,
            'articles/11/weekend-agenda-2' => 11,
            'articles/10/weekend-agenda-1-results' => 10,
            'articles/9/weekend-agenda-1' => 9,
            'articles/8/peppy-deletes-posts' => 8,
            'articles/6/webkit-not-loading-sounds' => 7,
            'articles/3/firefox-currenttime-problem' => 6,
            'articles/2/what-is-owp' => 5,
        );

        if (array_key_exists($path, $aliases)) {
            return new k_MovedPermanently ($this->url('forum/read.php?' . urlencode($this->forumId) . ',' . urlencode($aliases[$path])));
        } else {
            return null;
        }
    }

    function renderHtml() {
        // HACK FIXME
        $feedUrl = 'http://localhost' . $this->url('forum/feed.php?' . urlencode($this->forumId) . ',type=rss');

        $rss = file_get_contents($feedUrl);
        $xml = new SimpleXmlElement($rss);

        $posts = array();
        foreach ($xml->channel->item as $item) {
            $posts[] = array(
                'title' => (string) $item->title,
                'url' => (string) $item->link,
                'bodyHtml' => (string) $item->description,
                'date' => strtotime((string) $item->pubDate)
            );
        }

        $this->document->setTitle('owp blog');

        $t = $this->templates->create('blog-list');
        return $t->render($this, array(
            'posts' => $posts
        ));
    }
}
