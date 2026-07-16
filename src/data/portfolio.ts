import importedPortfolioAssets from "./portfolioAssets.generated.json";
import latestPortfolioOverrides from "./portfolioOverrides.latest.json";

export type ProjectCategoryId =
  | "visual"
  | "aigc"
  | "fashion"
  | "interior"
  | "painting"
  | "photography";

export type BackendCategoryId =
  | "Brand-Design"
  | "Product-Design"
  | "Digital-Design"
  | "Personal-Works";

export type PortfolioImage = {
  src: string;
  alt: string;
  caption: string;
  type?: "image" | "video";
  fit?: "cover" | "contain";
  objectPosition?: string;
  span?: "auto" | "full" | "wide" | "half" | "tall" | "square";
  zoom?: number;
  gridStart?: number;
  gridSpan?: number;
  layoutRatio?: number;
};

export type PortfolioProject = {
  id: string;
  name: string;
  nameEn: string;
  title: string;
  subtitle: string;
  intro: string;
  introEn: string;
  keywords: string[];
  images: PortfolioImage[];
};

export type PortfolioCategory = {
  id: ProjectCategoryId;
  label: string;
  labelEn: string;
  backendCategoryId?: BackendCategoryId;
  backendCategoryLabel?: string;
  backendCategoryLabelEn?: string;
  projects: PortfolioProject[];
};

const sharedStudio = "/assets/studio-reference.png";
const sharedTags = "/assets/studio-tags-reference.jpg";

type ImportedAsset = {
  src: string;
  originalName: string;
  caption: string;
  type: "image" | "video";
};

type ImportedProject = {
  category: "visual" | "aigc" | "fashion" | "other";
  slug: string;
  name: string;
  assets: ImportedAsset[];
};

const importedProjects = importedPortfolioAssets.projects as ImportedProject[];

type LatestProjectOverride = {
  images?: Array<PortfolioImage & { enabled?: boolean }>;
  copy?: Partial<Omit<PortfolioProject, "id" | "images">> & { hidden?: boolean };
};

const latestProjectOverrides = (latestPortfolioOverrides as {
  projects?: Record<string, LatestProjectOverride>;
}).projects ?? {};

const projectCopy: Record<
  string,
  {
    nameEn: string;
    title: string;
    subtitle: string;
    intro: string;
    introEn: string;
    keywords: string[];
  }
> = {
  插画: {
    nameEn: "Illustration",
    title: "Illustration System",
    subtitle: "儿童科普 / 画册 / 周边",
    intro: "围绕儿童食品安全科普展开插画、画册、展板与周边延展，建立亲和但有秩序的视觉系统。",
    introEn: "An illustrated science-education system extending into booklets, posters, and peripheral objects.",
    keywords: ["儿童科普", "插画系统", "画册设计", "周边延展"],
  },
  游戏: {
    nameEn: "Game",
    title: "Immersive Museum Study",
    subtitle: "辛亥革命博物馆 / 沉浸式体验",
    intro: "以博物馆调研为基础，整理空间叙事、交互路径与视觉体验，形成沉浸式设计研究档案。",
    introEn: "A museum-based experience study shaped by spatial narrative, interaction paths, and visual research.",
    keywords: ["博物馆", "沉浸体验", "空间叙事", "交互研究"],
  },
  "废土风-综合沙丘": {
    nameEn: "Wasteland",
    title: "Wasteland Dune",
    subtitle: "废土风 / 沙丘 / 造型实验",
    intro: "以沙丘与废土语汇为灵感，提取粗粝材质、包裹结构与未来感轮廓。",
    introEn: "A wasteland-inspired fashion study built from dune textures, wrapped structures, and speculative silhouettes.",
    keywords: ["废土风", "沙丘", "结构感", "材质实验"],
  },
  "可持续-海洋污染": {
    nameEn: "Sustainable Ocean",
    title: "Sustainable Ocean",
    subtitle: "可持续 / 海洋污染 / 配饰系统",
    intro: "从海洋污染议题出发，将环保材料、头饰、项圈与组合造型整合为可持续视觉叙事。",
    introEn: "A sustainable fashion narrative connecting ocean pollution, accessories, styling, and material reuse.",
    keywords: ["可持续", "海洋污染", "配饰", "环保材料"],
  },
  "新中式-釉青瓷器": {
    nameEn: "Celadon",
    title: "Celadon New Chinese",
    subtitle: "新中式 / 釉青瓷器 / 服装语言",
    intro: "以釉色、瓷器轮廓与东方留白为线索，构建温润克制的新中式服装表达。",
    introEn: "A restrained new-Chinese fashion language shaped by celadon glaze, ceramic form, and quiet space.",
    keywords: ["新中式", "釉青", "瓷器灵感", "东方留白"],
  },
  "异形蛛网-束缚突破": {
    nameEn: "Web Form",
    title: "Web Form Breakthrough",
    subtitle: "异形蛛网 / 束缚 / 突破",
    intro: "将蛛网结构转译为服装线条，在束缚与突破之间建立具有张力的身体轮廓。",
    introEn: "A silhouette study translating web-like structures into tension between restraint and release.",
    keywords: ["异形结构", "蛛网", "束缚", "突破"],
  },
  瓷: {
    nameEn: "Ceramic",
    title: "Ceramic Packaging",
    subtitle: "瓷器 / 包装 / 物件气质",
    intro: "以瓷器物性与包装展示为核心，探索产品在安静场景中的视觉秩序。",
    introEn: "A ceramic packaging study focused on object temperament and restrained display order.",
    keywords: ["瓷器", "包装", "物件", "展示秩序"],
  },
  酒: {
    nameEn: "Rice Wine",
    title: "Rice Wine Package",
    subtitle: "酒类包装 / 地域感 / 产品识别",
    intro: "围绕酒类产品建立包装识别、图形延展与货架展示关系。",
    introEn: "A beverage packaging system connecting identity, graphic extension, and shelf presence.",
    keywords: ["酒类包装", "品牌识别", "图形延展", "产品展示"],
  },
  女书: {
    nameEn: "Nushu",
    title: "Nushu Package",
    subtitle: "女书文化 / 包装视觉 / 字形转译",
    intro: "以女书文化和字形结构为视觉线索，将传统符号转译为当代包装语言。",
    introEn: "A packaging system translating Nushu cultural signs and letterform rhythm into contemporary design.",
    keywords: ["女书", "文化转译", "字形", "包装系统"],
  },
  青花瓷: {
    nameEn: "Blue Porcelain",
    title: "Blue Porcelain Visuals",
    subtitle: "青花瓷 / 纹样 / 包装实验",
    intro: "提取青花瓷纹样、蓝白关系与器物气质，形成具有东方审美的包装视觉。",
    introEn: "A blue-and-white porcelain packaging study built from pattern, contrast, and object elegance.",
    keywords: ["青花瓷", "纹样", "蓝白关系", "东方审美"],
  },
  "视觉设计-四套包装": {
    nameEn: "Package Index",
    title: "Package Index",
    subtitle: "四套包装 / 视觉索引",
    intro: "将多套包装项目整理为索引式入口，呈现不同主题下的视觉系统差异。",
    introEn: "An index view for multiple packaging systems and their distinct visual strategies.",
    keywords: ["包装索引", "视觉系统", "主题差异", "项目归档"],
  },
  扬子江糕点: {
    nameEn: "Yangtze Pastry",
    title: "Yangtze Pastry",
    subtitle: "糕点包装 / 传统食物 / 品牌延展",
    intro: "围绕糕点品牌展开包装、图形与场景展示，平衡传统感与当代商业表达。",
    introEn: "A pastry packaging system balancing traditional food culture with contemporary brand expression.",
    keywords: ["糕点包装", "传统食物", "品牌延展", "场景展示"],
  },
  其他作品: {
    nameEn: "Other Works",
    title: "Other Works",
    subtitle: "综合作品 / 手作 / 影像档案",
    intro: "收纳摄影、绘画、实验媒介与未归类创作，作为个人创作脉络中的开放档案。",
    introEn: "An open archive for photography, drawing, experimental media, and uncategorized works.",
    keywords: ["综合作品", "实验媒介", "创作档案", "开放归类"],
  },
};

const toImportedImages = (project: ImportedProject): PortfolioImage[] =>
  project.assets.map((asset, index) => ({
    src: asset.src,
    alt: `${project.name} ${asset.caption}`,
    caption: index === 0 ? `${project.name} / Cover` : asset.caption,
    type: asset.type,
  }));

const makeImportedProject = (project: ImportedProject): PortfolioProject => {
  const fallback = projectCopy[project.name] ?? {
    nameEn: project.name,
    title: project.name,
    subtitle: "作品档案 / Portfolio Archive",
    intro: "围绕视觉、材料与叙事整理的项目档案，保留完整的图像观看节奏。",
    introEn: "A project archive organized around image rhythm, material language, and visual narrative.",
    keywords: ["作品档案", "视觉节奏", "材料语言", "叙事整理"],
  };

  return {
    id: `${project.category}-${project.slug}`,
    name: project.name,
    nameEn: fallback.nameEn,
    title: fallback.title,
    subtitle: fallback.subtitle,
    intro: fallback.intro,
    introEn: fallback.introEn,
    keywords: fallback.keywords,
    images: toImportedImages(project),
  };
};

const importedByCategory = (category: ImportedProject["category"]) =>
  importedProjects
    .filter((project) => project.category === category && project.assets.length > 0)
    .map(makeImportedProject);

const importedBySlug = (...slugs: string[]) =>
  slugs
    .map((slug) => importedProjects.find((project) => project.slug === slug))
    .filter((project): project is ImportedProject => Boolean(project))
    .map(makeImportedProject);

const baseCategories: PortfolioCategory[] = [
  {
    id: "visual",
    label: "品牌视觉",
    labelEn: "Brand\u2011Visual",
    projects: importedByCategory("visual").length ? importedByCategory("visual") : [
      {
        id: "visual-identity",
        name: "视觉系统",
        nameEn: "Identity",
        title: "Brand\u2011Visual",
        subtitle: "品牌视觉 / Editorial System",
        intro: "以留白、节奏与信息秩序建立可持续的视觉识别，兼顾商业表达与艺术叙事。",
        introEn:
          "A restrained visual system shaped by whitespace, rhythm, and editorial hierarchy.",
        keywords: ["品牌识别", "版式秩序", "留白", "视觉节奏"],
        images: [
          { src: "/assets/visual-design.svg", alt: "极简视觉版式", caption: "Identity Study 01" },
          { src: sharedTags, alt: "作品标签参考画面", caption: "Spatial Label System" },
          { src: sharedStudio, alt: "纯白工作室参考", caption: "Studio Atmosphere" },
        ],
      },
      {
        id: "visual-editorial",
        name: "版式研究",
        nameEn: "Editorial",
        title: "Editorial Study",
        subtitle: "信息层级 / Layout Rhythm",
        intro: "围绕标题、图像与留白比例建立展示节奏，让项目阅读更像一组安静的展览动线。",
        introEn: "A layout sequence for reading projects as a calm gallery path.",
        keywords: ["信息层级", "网格", "图文节奏", "展览叙事"],
        images: [
          { src: sharedTags, alt: "作品标签参考画面", caption: "Label Composition" },
          { src: "/assets/visual-design.svg", alt: "极简视觉版式", caption: "Grid Study" },
          { src: "/assets/painting-work.svg", alt: "线条视觉研究", caption: "Line Reference" },
        ],
      },
    ],
  },
  {
    id: "aigc",
    label: "数字内容",
    labelEn: "Digital\u2011Content",
    projects: importedByCategory("aigc").length ? importedByCategory("aigc") : [
      {
        id: "aigc-frame",
        name: "生成影像",
        nameEn: "Image",
        title: "Digital\u2011Content",
        subtitle: "生成式影像 / Prompt Direction",
        intro: "从概念提案到视觉落地，使用 AIGC 建立快速迭代的图像实验流程。",
        introEn:
          "Generative image workflows for fast concept testing and art-directed iteration.",
        keywords: ["提示词", "影像实验", "风格控制", "快速迭代"],
        images: [
          { src: "/assets/aigc-design.svg", alt: "生成式图像实验", caption: "Generative Frame" },
          { src: sharedStudio, alt: "空间提示词视觉", caption: "Prompted Studio" },
          { src: "/assets/visual-design.svg", alt: "黑白排版系统", caption: "Interface Moodboard" },
        ],
      },
      {
        id: "aigc-storyboard",
        name: "叙事分镜",
        nameEn: "Storyboard",
        title: "Prompt Storyboard",
        subtitle: "视觉叙事 / AI Workflow",
        intro: "用连续图像组织情绪、空间与材质方向，让生成结果服务于完整的叙事结构。",
        introEn: "Sequential AI frames organized around mood, space, and material cues.",
        keywords: ["连续画面", "情绪板", "空间想象", "材质方向"],
        images: [
          { src: sharedStudio, alt: "空间提示词视觉", caption: "Studio Prompt" },
          { src: "/assets/aigc-design.svg", alt: "生成式图像实验", caption: "Frame Variation" },
          { src: sharedTags, alt: "项目标签参考", caption: "Display Context" },
        ],
      },
    ],
  },
  {
    id: "fashion",
    label: "产品设计",
    labelEn: "Product\u2011Design",
    projects: importedByCategory("fashion").length ? importedByCategory("fashion") : [
      {
        id: "fashion-silhouette",
        name: "廓形设计",
        nameEn: "Silhouette",
        title: "Product\u2011Design",
        subtitle: "廓形 / 材料 / Lookbook",
        intro: "围绕身体线条与面料秩序展开，用低饱和层次表达服装的安静力量。",
        introEn:
          "Quiet silhouettes and tactile material studies for a restrained fashion language.",
        keywords: ["廓形", "面料", "低饱和", "女性线条"],
        images: [
          { src: "/assets/fashion-design.svg", alt: "服装廓形设计", caption: "Silhouette Draft" },
          { src: sharedTags, alt: "工作室中的服装标签", caption: "Lookbook Scene" },
          { src: "/assets/painting-work.svg", alt: "绘画式面料灵感", caption: "Material Trace" },
        ],
      },
      {
        id: "fashion-lookbook",
        name: "系列手册",
        nameEn: "Lookbook",
        title: "Lookbook System",
        subtitle: "面料秩序 / Visual Manual",
        intro: "把廓形、材质与版式整合为可翻阅的视觉手册，形成更完整的服装叙事。",
        introEn: "A visual manual that connects silhouette, textile, and page rhythm.",
        keywords: ["Lookbook", "系列化", "材质记录", "视觉手册"],
        images: [
          { src: sharedTags, alt: "工作室中的服装标签", caption: "Lookbook Scene" },
          { src: "/assets/fashion-design.svg", alt: "服装廓形设计", caption: "Silhouette Study" },
          { src: "/assets/visual-design.svg", alt: "版式系统", caption: "Editorial Page" },
        ],
      },
    ],
  },
  {
    id: "interior",
    label: "空间设计",
    labelEn: "Interior\u2011Product",
    projects: [
      {
        id: "interior-studio",
        name: "白色工作室",
        nameEn: "Studio",
        title: "Interior\u2011Product",
        subtitle: "白色空间 / Soft Minimal",
        intro: "强调光、尺度与动线，构建可漫游、可停留、可被作品重新定义的工作室空间。",
        introEn:
          "White-space interiors led by light, proportion, circulation, and calm materiality.",
        keywords: ["空间比例", "自然光", "动线", "白色材质"],
        images: [
          { src: "/assets/interior-design.svg", alt: "极简室内空间图", caption: "Spatial Layout" },
          { src: sharedStudio, alt: "北欧纯白工作室", caption: "Reference Studio" },
          { src: sharedTags, alt: "空间中的项目标签", caption: "Interactive Zones" },
        ],
      },
      {
        id: "interior-gallery",
        name: "展陈动线",
        nameEn: "Gallery",
        title: "Gallery Flow",
        subtitle: "观看路径 / Spatial Display",
        intro: "以墙面、画框与光线组织作品观看顺序，让空间成为作品集的一部分。",
        introEn: "A display flow where wall, frame, and light guide the portfolio viewing.",
        keywords: ["展陈", "画框", "观看路径", "墙面秩序"],
        images: [
          { src: sharedStudio, alt: "北欧纯白工作室", caption: "Studio Wall" },
          { src: "/assets/interior-design.svg", alt: "极简室内空间图", caption: "Room Study" },
          { src: "/assets/photography-work.svg", alt: "空间摄影", caption: "Still Frame" },
        ],
      },
    ],
  },
  {
    id: "painting",
    label: "绘画书法",
    labelEn: "Calligraphy\u2011Paint",
    projects: [
      {
        id: "painting-lines",
        name: "线条档案",
        nameEn: "Lines",
        title: "Painting Works",
        subtitle: "线条 / 肌理 / 情绪采样",
        intro: "以线条和留白记录情绪，作品在轻与重之间建立更慢的观看节奏。",
        introEn:
          "Line-based studies that use blank space to hold slower emotional observation.",
        keywords: ["线条", "留白", "情绪", "慢观看"],
        images: [
          { src: "/assets/painting-work.svg", alt: "抽象线条绘画", caption: "Line Archive" },
          { src: "/assets/visual-design.svg", alt: "绘画版式研究", caption: "Gallery Layout" },
          { src: sharedStudio, alt: "画室参考", caption: "Atelier Light" },
        ],
      },
      {
        id: "painting-texture",
        name: "肌理研究",
        nameEn: "Texture",
        title: "Texture Study",
        subtitle: "材料痕迹 / Emotional Surface",
        intro: "将手绘痕迹、肌理切片与页面节奏并置，保留创作过程中的偶然性。",
        introEn: "Handmade traces and material fragments arranged as a slow visual surface.",
        keywords: ["肌理", "材料", "手绘痕迹", "偶然性"],
        images: [
          { src: "/assets/painting-work.svg", alt: "抽象线条绘画", caption: "Texture Trace" },
          { src: sharedTags, alt: "作品标签参考", caption: "Gallery Marker" },
          { src: "/assets/fashion-design.svg", alt: "面料灵感", caption: "Material Echo" },
        ],
      },
    ],
  },
  {
    id: "photography",
    label: "影像纪实",
    labelEn: "Photo\u2011Record",
    projects: importedByCategory("other").length ? importedByCategory("other") : [
      {
        id: "photography-still",
        name: "空间静帧",
        nameEn: "Still",
        title: "Photography",
        subtitle: "空间影像 / Silent Narrative",
        intro: "捕捉光线落在物体上的瞬间，让空间、人物与物件形成克制的叙事关系。",
        introEn:
          "Silent photographic narratives built from light, objects, and spatial pause.",
        keywords: ["自然光", "静物", "空间", "克制叙事"],
        images: [
          { src: "/assets/photography-work.svg", alt: "摄影视觉占位", caption: "Still Frame" },
          { src: sharedTags, alt: "工作室摄影参考", caption: "Studio Still" },
          { src: "/assets/interior-design.svg", alt: "室内空间取景", caption: "Interior Frame" },
        ],
      },
      {
        id: "photography-object",
        name: "物件叙事",
        nameEn: "Object",
        title: "Object Narrative",
        subtitle: "光线 / 物件 / Quiet Story",
        intro: "通过局部构图与自然光捕捉物件状态，让日常物品拥有安静的叙事重心。",
        introEn: "Object-focused stills composed with natural light and restrained framing.",
        keywords: ["局部构图", "日常物件", "光影", "静默故事"],
        images: [
          { src: sharedTags, alt: "工作室摄影参考", caption: "Object Study" },
          { src: "/assets/photography-work.svg", alt: "摄影视觉占位", caption: "Quiet Frame" },
          { src: sharedStudio, alt: "空间取景参考", caption: "Studio Context" },
        ],
      },
    ],
  },
];

const baseCategoryById = new Map(baseCategories.map((category) => [category.id, category]));

const baseProject = (categoryId: ProjectCategoryId, projectId: string) =>
  baseCategoryById.get(categoryId)?.projects.find((project) => project.id === projectId);

const compactProjects = (projects: Array<PortfolioProject | undefined>) =>
  projects.filter((project): project is PortfolioProject => Boolean(project));

const xiuyijingProject: PortfolioProject = {
  id: "aigc-xiuyijing",
  name: "绣艺境",
  nameEn: "Xiuyijing",
  title: "绣艺境｜非遗汉绣纹样基因库",
  subtitle: "数字文化平台 / 网页系统 / 非遗数据库",
  intro:
    "全流程自导完成的汉绣纹样数字基因库，覆盖网页视觉、交互体验、前后端搭建、HE 编码体系、资料收集、图样整理、数据库建档与版权说明。平台收录汉绣纹样数字档案，并从题材、寓意、色彩、年代、载体、工艺与来源等维度建立可浏览、可检索、可解析的数字文化展示系统。项目网址：https://xiuyijing.vercel.app/",
  introEn:
    "A self-directed digital archive for Han embroidery patterns, covering web interface design, interaction, frontend and backend implementation, HE coding, source research, pattern organization, database structuring, and rights documentation. Project URL: https://xiuyijing.vercel.app/",
  keywords: ["数字文化平台", "非遗数据库", "网页系统", "HE 编码", "资料整理"],
  images: [
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/01-home-hero.png",
      alt: "绣艺境非遗汉绣纹样基因库首页",
      caption: "首页完整长截图 / 非遗汉绣纹样基因库",
      gridSpan: 12,
      fit: "contain",
      layoutRatio: 0.37,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/09-home-particle-scatter.gif",
      alt: "绣艺境首页粒子烟雾散开动效",
      caption: "首页粒子动效 / 抽丝烟雾散开",
      gridSpan: 12,
      layoutRatio: 1.78,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/06-home-scroll.gif",
      alt: "绣艺境首页滚动浏览动效",
      caption: "首页完整滚动 / 项目叙事与模块浏览",
      gridSpan: 12,
      layoutRatio: 1.78,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/02-pattern-library.png",
      alt: "绣艺境纹样基因库列表",
      caption: "纹样基因库完整长截图 / 117 条纹样档案浏览",
      gridSpan: 12,
      fit: "contain",
      layoutRatio: 0.32,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/10-pattern-library-scroll.gif",
      alt: "绣艺境纹样基因库完整滚动动效",
      caption: "纹样基因库完整滚动 / 分类与档案浏览",
      gridSpan: 12,
      layoutRatio: 1.78,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/07-library-to-detail.gif",
      alt: "绣艺境从纹样库进入单件档案的交互流程",
      caption: "筛选检索 / 从纹样库进入单件档案",
      gridSpan: 12,
      layoutRatio: 1.78,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/03-pattern-detail.png",
      alt: "绣艺境单件汉绣纹样详情档案",
      caption: "单件档案完整长截图 / 编码、寓意、工艺、来源与版权状态",
      gridSpan: 12,
      fit: "contain",
      layoutRatio: 0.58,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/11-pattern-detail-scroll.gif",
      alt: "绣艺境单件纹样详情页完整滚动动效",
      caption: "单件档案完整滚动 / 档案字段与相似纹样",
      gridSpan: 12,
      layoutRatio: 1.78,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/04-gene-analysis.png",
      alt: "绣艺境基因解析页面",
      caption: "基因解析完整长截图 / 纹样卡片与文化结构拆解",
      gridSpan: 12,
      fit: "contain",
      layoutRatio: 0.38,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/08-gene-analysis.gif",
      alt: "绣艺境基因解析动态展示",
      caption: "基因解析完整滚动动效 / 纹样可视化展示",
      gridSpan: 12,
      layoutRatio: 1.78,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/05-about-method.png",
      alt: "绣艺境项目说明与 HE 编码体系",
      caption: "项目说明完整长截图 / HE 编码体系与数据整理流程",
      gridSpan: 12,
      fit: "contain",
      layoutRatio: 0.27,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/12-about-scroll.gif",
      alt: "绣艺境关于页与 HE 编码体系完整滚动动效",
      caption: "关于页完整滚动 / 项目定位、编码体系与数据流程",
      gridSpan: 12,
      layoutRatio: 1.78,
    },
    {
      src: "/assets/portfolio-import-v2/aigc/project-xiuyijing/13-project-url.png",
      alt: "绣艺境项目网址 https://xiuyijing.vercel.app/",
      caption: "项目网址 / https://xiuyijing.vercel.app/",
      gridSpan: 12,
      fit: "contain",
      layoutRatio: 1.78,
    },
  ],
};

const fixedCategoryRules: Record<
  ProjectCategoryId,
  Omit<PortfolioCategory, "id">
> = {
  visual: {
    label: "品牌视觉",
    labelEn: "Brand\u2011Visual",
    backendCategoryId: "Brand-Design",
    backendCategoryLabel: "品牌设计",
    backendCategoryLabelEn: "Brand\u2011Design",
    projects: [
      ...importedBySlug(
        "project-9daf22f5",
        "project-811ba9dd",
        "project-4fbb444d",
        "project-135a2dc4",
        "project-e130cbdd",
        "project-d06ccd44",
      ),
    ],
  },
  aigc: {
    label: "数字内容",
    labelEn: "Digital\u2011Content",
    backendCategoryId: "Digital-Design",
    backendCategoryLabel: "数字创作",
    backendCategoryLabelEn: "Digital\u2011Design",
    projects: [xiuyijingProject, ...importedBySlug("project-ba08216f")],
  },
  fashion: {
    label: "产品设计",
    labelEn: "Product\u2011Design",
    backendCategoryId: "Product-Design",
    backendCategoryLabel: "产品设计",
    backendCategoryLabelEn: "Product\u2011Design",
    projects: importedBySlug(
      "project-26e940dc",
      "project-5018bcc6",
      "project-bc694ef1",
      "project-83d3712d",
    ),
  },
  interior: {
    label: "空间设计",
    labelEn: "Interior\u2011Product",
    backendCategoryId: "Product-Design",
    backendCategoryLabel: "产品设计",
    backendCategoryLabelEn: "Product\u2011Design",
    projects: compactProjects([baseProject("interior", "interior-studio")]),
  },
  painting: {
    label: "绘画书法",
    labelEn: "Calligraphy\u2011Paint",
    backendCategoryId: "Personal-Works",
    backendCategoryLabel: "艺术习作",
    backendCategoryLabelEn: "Personal\u2011Works",
    projects: compactProjects([baseProject("painting", "painting-lines")]),
  },
  photography: {
    label: "影像纪实",
    labelEn: "Photo\u2011Record",
    backendCategoryId: "Personal-Works",
    backendCategoryLabel: "艺术习作",
    backendCategoryLabelEn: "Personal\u2011Works",
    projects: importedBySlug("project-10769b58"),
  },
};

const applyLatestProjectOverride = (project: PortfolioProject): PortfolioProject => {
  const override = latestProjectOverrides[project.id];
  if (!override) {
    return project;
  }

  const copy = override.copy ?? {};
  const images = Array.isArray(override.images)
    ? override.images
        .filter((image) => image.enabled !== false)
        .map(({ enabled: _enabled, ...image }) => image)
    : project.images;

  return {
    ...project,
    name: copy.name ?? project.name,
    nameEn: copy.nameEn ?? project.nameEn,
    title: copy.title ?? project.title,
    subtitle: copy.subtitle ?? project.subtitle,
    intro: copy.intro ?? project.intro,
    introEn: copy.introEn ?? project.introEn,
    keywords: copy.keywords ?? project.keywords,
    images,
  };
};

export const categories: PortfolioCategory[] = baseCategories.map((category) => ({
  ...category,
  ...fixedCategoryRules[category.id],
  projects: (fixedCategoryRules[category.id].projects.length
    ? fixedCategoryRules[category.id].projects
    : category.projects
  ).map(applyLatestProjectOverride),
}));

export const categoryMap = new Map(categories.map((category) => [category.id, category]));
