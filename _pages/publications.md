---
layout: page
permalink: /publications/
title: publications
description: Research outputs in multimodal learning, biomedical AI, medical imaging, and generative systems.
years: [2026, 2025, 2024, 2023, 2022, 2021, 2020]
nav: true
nav_order: 2
---
<!-- _pages/publications.md -->
{% include scholar_stats.html %}

<div class="publications">

{%- for y in page.years %}
  <h2 class="year">{{y}}</h2>
  {% bibliography -f papers -q @*[year={{y}}]* %}
{% endfor %}

</div>
