<?php

class components_blog extends owpcomponent {
    protected $templates;

    function __construct(k_TemplateFactory $templates) {
        $this->templates = $templates;
    }

    function renderHtml() {
        // HACK FIXME
        $feedUrl = 'http://localhost' . $this->url('forum/feed.php?1,type=rss');

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
