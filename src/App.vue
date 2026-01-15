<template>
  <div class="app-container">
    <!-- 标签页导航 -->
    <div class="tabs">
      <div 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-item"
        :class="{ 'active': activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-text">{{ tab.text }}</span>
      </div>
    </div>
    
    <!-- 文章发布标签页 -->
    <div v-if="activeTab === 'articlePublish'" class="tab-content">
      <h2 class="tab-title">{{ t('publish.title') }}</h2>
      
      <!-- 未配置提示 -->
      <div v-if="!isConfigValid" class="config-warning">
        <span class="warning-icon">⚠️</span>
        <span>{{ t('msg.configFirst') }}</span>
        <button @click="switchTab('generalSettings')" class="btn-link">{{ t('tab.settings') }}</button>
      </div>
      
      <!-- 发布新文章部分 -->
      <div class="publish-section">
        <h3>{{ t('publish.title') }}</h3>
        <div class="button-group">
          <button @click="fetchCurrentNote" class="btn-primary">{{ t('publish.fetchNote') }}</button>
          <button @click="clearPostForm" class="btn-secondary">{{ t('publish.clearForm') }}</button>
        </div>
        <div v-if="noteFetchError" class="error-message">{{ noteFetchError }}</div>
        
        <div class="form-grid">
          <div class="form-group">
            <label for="postTitle">{{ t('publish.articleTitle') }}</label>
            <input 
              type="text" 
              id="postTitle" 
              v-model="postForm.title" 
              :placeholder="t('publish.articleTitlePlaceholder')"
            >
          </div>
          
          <div class="form-group">
            <label for="postSlug">{{ t('publish.slug') }}</label>
            <input 
              type="text" 
              id="postSlug" 
              v-model="postForm.slug" 
              :placeholder="t('publish.slugPlaceholder')"
            >
          </div>
        </div>
        
        <div class="form-group">
          <label for="postCover">{{ t('publish.cover') }}</label>
          <input 
            type="text" 
            id="postCover" 
            v-model="postForm.coverImage" 
            :placeholder="t('publish.coverPlaceholder')"
          >
          <div v-if="!postForm.coverImage" class="warning-message">{{ t('publish.warningNoCover') }}</div>
        </div>

        <!-- 存储策略选择（可选，覆盖默认设置） -->
        <div class="form-group" v-if="storagePolicies.length > 0">
          <label>{{ t('publish.storagePolicy') }}</label>
          <select v-model="publishStoragePolicy" class="filter-select">
            <option value="">{{ t('publish.storagePolicyPlaceholder') }}</option>
            <option v-for="policy in storagePolicies" :key="policy.id" :value="policy.id">
              {{ policy.name }} ({{ policy.templateName }})
            </option>
          </select>
        </div>

        <!-- 发布选项 -->
        <div class="form-group">
          <label>{{ t('publish.publishOptions') }}</label>
          <div class="publish-options-grid">
            <div class="option-item">
              <input type="checkbox" id="allowComment" v-model="publishOptions.allowComment">
              <label for="allowComment">{{ t('publish.allowComment') }}</label>
            </div>
            <div class="option-item">
              <input type="checkbox" id="pinned" v-model="publishOptions.pinned">
              <label for="pinned">{{ t('publish.pinned') }}</label>
            </div>
            <div class="option-item">
              <label for="visible">{{ t('publish.visibility') }}</label>
              <select id="visible" v-model="publishOptions.visible">
                <option value="PUBLIC">{{ t('publish.visibilityPublic') }}</option>
                <option value="PRIVATE">{{ t('publish.visibilityPrivate') }}</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- 分类标签选择 -->
        <div class="taxonomy-grid">
            <!-- 分类选择 -->
            <div class="form-group taxonomy-group">
              <label>{{ t('publish.category') }} ({{ categories.length }})</label>
              <div class="taxonomy-selector">
                <div 
                  v-for="category in categories" 
                  :key="category.id"
                  class="taxonomy-item"
                  :class="{ 'selected': selectedCategories.includes(category.id) }"
                  @click="toggleCategory(category.id)"
                >
                  {{ category.name }}
                </div>
                <div v-if="categories.length === 0" style="color: #999; font-size: 13px; width: 100%; text-align: center; padding: 10px;">
                  {{ t('publish.noCategory') }}
                </div>
              </div>
              <div class="new-taxonomy">
                <input 
                  type="text" 
                  v-model="newCategoryName" 
                  :placeholder="t('publish.categoryPlaceholder')"
                  @keyup.enter="addNewCategory"
                >
                <button @click="addNewCategory" class="btn-small">{{ t('publish.addCategory') }}</button>
              </div>
            </div>
            
            <!-- 标签选择 -->
            <div class="form-group taxonomy-group">
              <label>{{ t('publish.tag') }} ({{ tags.length }})</label>
              <div class="taxonomy-selector">
                <div 
                  v-for="tag in tags" 
                  :key="tag.id"
                  class="taxonomy-item"
                  :class="{ 'selected': selectedTags.includes(tag.id) }"
                  @click="toggleTag(tag.id)"
                >
                  {{ tag.name }}
                </div>
                <div v-if="tags.length === 0" style="color: #999; font-size: 13px; width: 100%; text-align: center; padding: 10px;">
                  {{ t('publish.noTag') }}
                </div>
              </div>
              <div class="new-taxonomy">
                <input 
                  type="text" 
                  v-model="newTagName" 
                  :placeholder="t('publish.tagPlaceholder')"
                  @keyup.enter="addNewTag"
                >
                <button @click="addNewTag" class="btn-small">{{ t('publish.addTag') }}</button>
              </div>
            </div>
            </div>
            
            <!-- 调试信息 -->
            <div v-if="showDebug" style="margin-top: 10px; font-size: 12px; color: #666;">
              <details>
                <summary>Debug: 分类数据 ({{ categories.length }})</summary>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; max-height: 200px;">{{ JSON.stringify(categories, null, 2) }}</pre>
              </details>
              <details style="margin-top: 5px;">
                <summary>Debug: 标签数据 ({{ tags.length }})</summary>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; max-height: 200px;">{{ JSON.stringify(tags, null, 2) }}</pre>
              </details>
            </div>
          
          <div class="form-group">
            <label for="postSummary">{{ t('publish.summary') }}</label>
          <textarea 
            id="postSummary" 
            v-model="postForm.summary" 
            :placeholder="t('publish.summaryPlaceholder')"
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-group">
          <div class="content-header">
            <label for="postContent">{{ t('publish.content') }}</label>
            <div class="content-tabs">
              <button 
                @click="previewMode = 'edit'" 
                :class="['tab-btn', { active: previewMode === 'edit' }]"
              >{{ t('publish.edit') }}</button>
              <button 
                @click="previewMode = 'preview'" 
                :class="['tab-btn', { active: previewMode === 'preview' }]"
              >{{ t('publish.preview') }}</button>
            </div>
          </div>
          <textarea 
            v-if="previewMode === 'edit'"
            id="postContent" 
            v-model="postForm.content" 
            :placeholder="t('publish.contentPlaceholder')"
            rows="12"
          ></textarea>
          <div 
            v-else 
            class="content-preview"
            v-html="renderedContent"
          ></div>
        </div>
        
        <div class="button-group">
          <button @click="publishPost" class="btn-primary" :disabled="!isConfigValid || !isPostFormValid || isPublishing">
            {{ isPublishing ? t('publish.publishing') : t('publish.publishBtn') }}
          </button>
        </div>
        
        <!-- 发布进度条 -->
        <div class="publish-progress" v-if="isPublishing">
          <div class="progress-header">
            <span class="progress-step">{{ publishStep }}</span>
            <span class="progress-percent">{{ publishProgress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: publishProgress + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 文章管理标签页 -->
    <div v-if="activeTab === 'articleManagement'" class="tab-content">
      <h2 class="tab-title">{{ t('management.title') }}</h2>
      
      <!-- 视图切换 -->
      <div class="view-switcher">
        <button 
          :class="['view-btn', viewMode === 'halo' ? 'active' : '']"
          @click="viewMode = 'halo'"
        >
          {{ t('management.haloArticles') }}
        </button>
        <button 
          :class="['view-btn', viewMode === 'siyuan' ? 'active' : '']"
          @click="viewMode = 'siyuan'"
        >
          {{ t('management.publishedNotes') }}
        </button>
      </div>

      <!-- Halo 文章视图 -->
      <div v-if="viewMode === 'halo'">
        <div class="filter-toolbar">
          <div class="filter-row">
            <input 
              type="text" 
              v-model="postSearchQuery" 
              :placeholder="t('management.search')"
              class="search-input"
            >
            <div class="filter-group">
              <label class="filter-label">{{ t('management.categories') }}</label>
              <select v-model="filterCategory" class="filter-select">
                <option value="">{{ t('management.filterAll') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">{{ t('management.tags') }}</label>
              <select v-model="filterTag" class="filter-select">
                <option value="">{{ t('management.filterAll') }}</option>
                <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">{{ t('management.source') }}</label>
              <select v-model="filterSource" class="filter-select">
                <option value="">{{ t('management.filterAll') }}</option>
                <option value="plugin">{{ t('management.sourcePlugin') }}</option>
                <option value="halo">{{ t('management.sourceHalo') }}</option>
              </select>
            </div>
            <button @click="fetchPublishedPosts" class="btn-secondary" :disabled="!isConfigValid">{{ t('management.refresh') }}</button>
          </div>
        </div>
        
        <!-- 文章列表 -->
        <div class="published-section">
          <div class="posts-table" v-if="filteredPosts.length > 0">
            <table>
              <thead>
                <tr>
                  <th>{{ t('management.articleTitle') }}</th>
                  <th>{{ t('management.source') }}</th>
                  <th>{{ t('management.categories') }}</th>
                  <th>{{ t('management.tags') }}</th>
                  <th>{{ t('management.lastUpdate') }}</th>
                  <th>{{ t('management.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="post in filteredPosts" :key="post.id">
                  <td class="post-title-cell">
                    <a :href="post.url" target="_blank" class="post-title-link">{{ post.title }}</a>
                  </td>
                  <td>
                    <span class="source-badge" :class="post.source === 'plugin' ? 'source-plugin' : 'source-halo'">
                      {{ post.source === 'plugin' ? t('management.sourcePlugin') : t('management.sourceHalo') }}
                    </span>
                  </td>
                  <td class="post-cats">
                    <span v-for="cat in (post.categoryNames || [])" :key="cat" class="tag-badge cat-badge">{{ cat }}</span>
                    <span v-if="!post.categoryNames?.length" class="no-data">-</span>
                  </td>
                  <td class="post-tags">
                    <span v-for="tag in (post.tagNames || [])" :key="tag" class="tag-badge">{{ tag }}</span>
                    <span v-if="!post.tagNames?.length" class="no-data">-</span>
                  </td>
                  <td>{{ formatDate(post.publishedTime) }}</td>
                  <td class="action-buttons">
                    <button @click="openEditDialog(post)" class="btn-small" :disabled="isDeleting === post.id">{{ t('management.edit') }}</button>
                    <button @click="deletePost(post.id)" class="btn-small btn-danger" :disabled="isDeleting === post.id">
                      {{ isDeleting === post.id ? t('msg.loading') : t('management.delete') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">
            {{ t('management.noData') }}
          </div>
        </div>
      </div>

      <!-- 思源笔记视图 -->
      <div v-if="viewMode === 'siyuan'">
        <div class="filter-toolbar">
          <div class="filter-row">
            <input 
              type="text" 
              v-model="siyuanSearchQuery" 
              :placeholder="t('management.search')"
              class="search-input"
            >
            <div class="filter-group">
              <label class="filter-label">{{ t('management.categories') }}</label>
              <select v-model="siyuanFilterCategory" class="filter-select">
                <option value="">{{ t('management.filterAll') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">{{ t('management.tags') }}</label>
              <select v-model="siyuanFilterTag" class="filter-select">
                <option value="">{{ t('management.filterAll') }}</option>
                <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
              </select>
            </div>
            <button @click="fetchSiyuanNotes" class="btn-secondary">{{ t('management.refreshStatus') }}</button>
          </div>
        </div>

        <div class="published-section">
          <div class="posts-table" v-if="filteredSiyuanNotes.length > 0">
            <table>
              <thead>
                <tr>
                  <th>{{ t('management.noteTitle') }}</th>
                  <th>{{ t('management.categories') }}</th>
                  <th>{{ t('management.tags') }}</th>
                  <th>{{ t('management.status') }}</th>
                  <th>{{ t('management.lastUpdate') }}</th>
                  <th>{{ t('management.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredSiyuanNotes" :key="item.id">
                  <td class="post-title-cell">
                    <span class="post-title-link" style="color: inherit; cursor: default;">{{ item.title }}</span>
                  </td>
                  <td class="post-cats">
                    <span v-for="cat in (item.categoryNames || [])" :key="cat" class="tag-badge cat-badge">{{ cat }}</span>
                    <span v-if="!item.categoryNames?.length" class="no-data">-</span>
                  </td>
                  <td class="post-tags">
                    <span v-for="tag in (item.tagNames || [])" :key="tag" class="tag-badge">{{ tag }}</span>
                    <span v-if="!item.tagNames?.length" class="no-data">-</span>
                  </td>
                  <td>
                    <span v-if="item.isDeleted" class="status-badge status-deleted" style="background-color: #ffebee; color: #d32f2f; border: 1px solid #ffcdd2;">{{ t('management.statusDeleted') }}</span>
                    <span v-else-if="item.isModified" class="status-badge status-modified">{{ t('management.statusModified') }}</span>
                    <span v-else class="status-badge status-synced">{{ t('management.statusSynced') }}</span>
                  </td>
                  <td>{{ formatDate(item.updated) }}</td>
                  <td class="action-buttons">
                    <button 
                      v-if="item.isDeleted"
                      @click="removeAssociation(item)"
                      class="btn-small btn-danger"
                    >{{ t('management.deleteRecord') }}</button>
                    <button 
                      v-else-if="item.isModified" 
                      @click="updateToHalo(item)" 
                      class="btn-small btn-primary"
                      :disabled="isUpdating === item.id"
                    >
                      {{ isUpdating === item.id ? t('msg.loading') : t('management.updateToHalo') }}
                    </button>
                    <span v-else style="color: #999; font-size: 12px;">{{ t('management.noUpdate') }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">
            {{ t('management.noData') }}
          </div>
        </div>
      </div>
      
      <!-- 编辑对话框 -->
      <div v-if="showEditDialog" class="modal-overlay" @click.self="closeEditDialog">
        <div class="modal-content edit-dialog">
          <div class="modal-header">
            <h3>{{ t('management.edit') }}</h3>
            <button @click="closeEditDialog" class="close-btn">×</button>
          </div>
          <div class="modal-body">
            <div class="edit-warning" v-if="PublishStore.isPluginPublished(editingPostId)">
              <span class="warning-icon">⚠️</span>
              <span>此文章由插件发布。文章标题建议在思源笔记中修改后使用同步功能更新，其余参数如别名、分类、标签、发布选项等可以直接在这里修改。</span>
            </div>
            <div class="edit-form-group">
              <label class="edit-label">{{ t('management.articleTitle') }}</label>
              <input type="text" v-model="editForm.title" class="edit-input">
            </div>
            <div class="edit-form-group">
              <label class="edit-label">{{ t('publish.slug') }}</label>
              <input type="text" v-model="editForm.slug" class="edit-input" placeholder="留空自动生成">
            </div>
            <div class="edit-form-group">
              <label class="edit-label">{{ t('publish.category') }}</label>
              <div class="taxonomy-edit-box">
                <div 
                  v-for="cat in categories" 
                  :key="cat.id"
                  class="taxonomy-edit-item"
                  :class="{ 'selected': editForm.categories.includes(cat.id) }"
                  @click="toggleEditCategory(cat.id)"
                >
                  {{ cat.name }}
                </div>
                <div v-if="categories.length === 0" class="taxonomy-empty">暂无分类</div>
              </div>
            </div>
            <div class="edit-form-group">
              <label class="edit-label">标签</label>
              <div class="taxonomy-edit-box">
                <div 
                  v-for="tag in tags" 
                  :key="tag.id"
                  class="taxonomy-edit-item tag-item"
                  :class="{ 'selected': editForm.tags.includes(tag.id) }"
                  @click="toggleEditTag(tag.id)"
                >
                  {{ tag.name }}
                </div>
                <div v-if="tags.length === 0" class="taxonomy-empty">暂无标签</div>
              </div>
            </div>
            <!-- 发布选项 -->
            <div class="edit-form-group">
              <label class="edit-label">{{ t('publish.publishOptions') }}</label>
              <div class="edit-publish-options">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="editForm.allowComment">
                  <span>{{ t('publish.allowComment') }}</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="editForm.pinned">
                  <span>{{ t('publish.pinned') }}</span>
                </label>
                <div class="visibility-inline">
                  <span>{{ t('publish.visibility') }}:</span>
                  <select v-model="editForm.visible" class="visibility-dropdown-small">
                    <option value="PUBLIC">{{ t('publish.visibilityPublic') }}</option>
                    <option value="PRIVATE">{{ t('publish.visibilityPrivate') }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="closeEditDialog" class="btn-secondary">取消</button>
            <button @click="saveEditForm" class="btn-primary" :disabled="isSaving">
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 通用设置标签页 -->
    <div v-if="activeTab === 'generalSettings'" class="tab-content">
      <h2 class="tab-title">{{ t('settings.title') }}</h2>
      
      <!-- 登录配置 -->
      <div class="settings-section">
        <h3>{{ t('settings.loginConfig') }}</h3>
        
        <!-- 授权状态显示 -->
        <div class="auth-status-card" :class="authStatusClass">
          <div class="auth-status-icon">{{ authStatusIcon }}</div>
          <div class="auth-status-info">
            <div class="auth-status-title">{{ authStatusTitle }}</div>
            <div class="auth-status-desc">{{ authStatusDesc }}</div>
          </div>
          <div class="auth-status-actions">
            <button v-if="isConfigValid" @click="recheckAuth" class="btn-outline" :disabled="isCheckingAuth">
              {{ isCheckingAuth ? t('settings.checking') : t('settings.checkStatus') }}
            </button>
          </div>
        </div>

        <!-- Halo 网站地址 -->
        <div class="form-group">
          <label for="haloUrl">{{ t('settings.haloUrl') }}</label>
          <input 
            type="text" 
            id="haloUrl" 
            v-model="configForm.url" 
            placeholder="https://your-halo-site.com"
          >
        </div>
        
        <!-- Cookie 配置（主要方式） -->
        <div class="cookie-config-section">
          <!-- 自动获取 Cookie 按钮 -->
          <div class="auto-login-section">
            <h4>{{ t('settings.autoLogin') }}</h4>
            <p class="help-text">{{ t('settings.autoLoginDesc') }}</p>
            <button @click="autoGetCookie" class="btn-primary" :disabled="!configForm.url || isGettingCookie">
              {{ isGettingCookie ? t('settings.gettingCookie') : t('settings.openLoginWindow') }}
            </button>
          </div>

          <div class="divider">
            <span>{{ t('settings.orManual') }}</span>
          </div>

          <div class="form-group">
            <label for="cookie">Cookie <span class="required">*</span></label>
            <textarea 
              id="cookie" 
              v-model="configForm.cookie" 
              :placeholder="t('settings.cookiePlaceholder')"
              rows="3"
            ></textarea>
          </div>
          
          <details class="cookie-help-details">
            <summary>{{ t('settings.howToGetCookie') }}</summary>
            <ol>
              <li>
                <button @click="openHaloConsole" class="btn-text" :disabled="!configForm.url">
                  {{ t('settings.openHaloConsole') }}
                </button>
                {{ t('settings.cookieStep1Suffix') }}
              </li>
              <li>{{ t('settings.cookieStep2') }}</li>
              <li>{{ t('settings.cookieStep3') }}</li>
              <li>{{ t('settings.cookieStep4') }}</li>
              <li>{{ t('settings.cookieStep5') }}</li>
              <li>{{ t('settings.cookieStep6') }}</li>
              <li>{{ t('settings.cookieStep7') }}</li>
            </ol>
          </details>
          
          <div class="button-group">
            <button @click="saveAndVerifyCookie" class="btn-primary" :disabled="!configForm.url || !configForm.cookie">
              {{ t('settings.saveAndVerify') }}
            </button>
            <button @click="saveConfig" class="btn-outline" :disabled="!configForm.url || !configForm.cookie">
              {{ t('settings.saveOnly') }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- 格式调整选项 -->
      <div class="settings-section">
        <h3>{{ t('settings.formatOptions') }}</h3>
        <div class="setting-item">
          <div class="setting-info">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formatOptions.removeH1"> {{ t('settings.removeH1') }}
            </label>
            <div class="setting-description">{{ t('settings.removeH1Desc') }}</div>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formatOptions.autoGenerateSlug"> {{ t('settings.autoSlug') }}
            </label>
            <div class="setting-description">{{ t('settings.autoSlugDesc') }}</div>
          </div>
          <div class="setting-options slug-options" v-if="formatOptions.autoGenerateSlug">
            <div class="slug-mode-group">
              <label class="slug-mode-item" :class="{ active: slugOptions.mode === 'timestamp' }">
                <input type="radio" name="slugMode" v-model="slugOptions.mode" value="timestamp">
                <span class="mode-text">{{ t('settings.slugTimestamp') }}</span>
                <span class="mode-hint">{{ t('settings.slugTimestampHint') }}</span>
              </label>
              <label class="slug-mode-item" :class="{ active: slugOptions.mode === 'translate' }">
                <input type="radio" name="slugMode" v-model="slugOptions.mode" value="translate">
                <span class="mode-text">{{ t('settings.slugTranslate') }}</span>
                <span class="mode-hint">{{ t('settings.slugTranslateHint') }}</span>
              </label>
              <label class="slug-mode-item" :class="{ active: slugOptions.mode === 'original' }">
                <input type="radio" name="slugMode" v-model="slugOptions.mode" value="original">
                <span class="mode-text">{{ t('settings.slugOriginal') }}</span>
                <span class="mode-hint">{{ t('settings.slugOriginalHint') }}</span>
              </label>
            </div>
            <label class="checkbox-label slug-extra-option" v-if="slugOptions.mode !== 'timestamp'">
              <input type="checkbox" v-model="slugOptions.lowercase"> {{ t('settings.lowercase') }}
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formatOptions.optimizeImages"> {{ t('settings.optimizeImages') }}
            </label>
            <div class="setting-description">{{ t('settings.optimizeImagesDesc') }}</div>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label class="checkbox-label">
              <input type="checkbox" v-model="showDebug"> {{ t('settings.showDebug') }}
            </label>
            <div class="setting-description">{{ t('settings.showDebugDesc') }}</div>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">{{ t('settings.language') }}</label>
            <div class="setting-description">{{ t('settings.languageDesc') }}</div>
          </div>
          <div class="setting-control">
            <select v-model="currentLanguage" @change="onLanguageChange" class="language-select">
              <option v-for="opt in languageOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">{{ t('settings.storagePolicy') }}</label>
            <div class="setting-description">{{ t('settings.storagePolicyDesc') }}</div>
          </div>
          <div class="setting-control">
            <select v-model="selectedStoragePolicy" class="language-select" :disabled="!isConfigValid || isLoadingPolicies">
              <option value="">{{ t('settings.storagePolicyDefault') }}</option>
              <option v-if="isLoadingPolicies" value="" disabled>{{ t('settings.storagePolicyLoading') }}</option>
              <option v-if="!isLoadingPolicies && storagePolicies.length === 0" value="" disabled>{{ t('settings.storagePolicyNone') }}</option>
              <option v-for="policy in storagePolicies" :key="policy.id" :value="policy.id">
                {{ policy.name }} ({{ policy.templateName }})
              </option>
            </select>
          </div>
        </div>

        <div class="button-group">
          <button @click="saveFormatOptions" class="btn-primary">{{ t('settings.saveSettings') }}</button>
        </div>
      </div>
    </div>
    
    <!-- 关于标签页 -->
    <div v-if="activeTab === 'about'" class="tab-content">
      <h2 class="tab-title">{{ t('about.title') }}</h2>
      
      <div class="about-section">
        <div class="about-header">
          <h3>{{ t('about.pluginName') }}</h3>
          <div class="version">{{ t('about.version') }}: 1.0.0</div>
        </div>
        
        <div class="about-content">
          <p>{{ t('about.description') }}</p>
          
          <h4>{{ t('about.author') }}</h4>
          <div class="author-info">
            <p>Sundaydream</p>
            <p>{{ t('about.github') }}: <a href="https://github.com/Sundaydream/siyuan-plugin-halo-publisher" target="_blank">https://github.com/Sundaydream/siyuan-plugin-halo-publisher</a></p>
          </div>
          
          <h4>{{ t('about.license') }}</h4>
          <p>{{ t('about.licenseText') }}</p>

          <h4>{{ t('about.disclaimer') }}</h4>
          <p>{{ t('about.disclaimerText') }}</p>
        </div>
      </div>
    </div>
    
    <!-- 消息提示 -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
      <button @click="clearMessage" class="close-btn">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useHalowebWeb, saveConfig as saveLocalConfig, loadConfig } from './utils/useHalowebWeb';
import { HalowebWebAdaptor } from './adaptors/HalowebWebAdaptor';
import { SiyuanUtils } from './utils/siyuanUtils';
import { SlugUtils } from './utils/slugUtils';
import { Post, Category, Tag, SlugOptions, SiyuanNoteItem } from './types';
import { PublishStore } from './utils/publishStore';
import { ImageCacheStore } from './utils/imageCacheStore';
import { t, currentLanguage, setLanguage, languageOptions, Language } from './utils/i18n';

// 定义 props
const props = defineProps<{
  initialTab?: string;
  plugin?: any;
}>();

// 调试模式开关
const showDebug = ref(false);

// 标签页配置（响应式，支持多语言）
const activeTab = ref('articlePublish');
const tabs = computed(() => [
  {
    id: 'articlePublish',
    text: t('tab.publish'),
    icon: '📝'
  },
  {
    id: 'articleManagement',
    text: t('tab.management'),
    icon: '📊'
  },
  {
    id: 'generalSettings',
    text: t('tab.settings'),
    icon: '⚙️'
  },
  {
    id: 'about',
    text: t('tab.about'),
    icon: 'ℹ️'
  }
]);

// 配置表单
const configForm = reactive({
  url: '',
  cookie: ''
});



// 授权相关状态
const isCheckingAuth = ref(false);
const authStatus = ref<'unknown' | 'valid' | 'invalid' | 'expired'>('unknown');
const isGettingCookie = ref(false);

// 授权状态计算属性
const authStatusClass = computed(() => {
  if (authStatus.value === 'valid') return 'auth-valid';
  if (authStatus.value === 'invalid' || authStatus.value === 'expired') return 'auth-invalid';
  return 'auth-unknown';
});

const authStatusIcon = computed(() => {
  if (authStatus.value === 'valid') return '✅';
  if (authStatus.value === 'invalid' || authStatus.value === 'expired') return '❌';
  return '⚠️';
});

const authStatusTitle = computed(() => {
  if (authStatus.value === 'valid') return t('auth.valid');
  if (authStatus.value === 'expired') return t('auth.expired');
  if (authStatus.value === 'invalid') return t('auth.invalid');
  return isConfigValid.value ? t('auth.unknown') : t('auth.notConfigured');
});

const authStatusDesc = computed(() => {
  if (authStatus.value === 'valid') return t('auth.validDesc');
  if (authStatus.value === 'expired') return t('auth.expiredDesc');
  if (authStatus.value === 'invalid') return t('auth.invalidDesc');
  return isConfigValid.value ? t('auth.clickCheck') : t('auth.notConfiguredDesc');
});

// 文章表单
const postForm = reactive({
  title: '',
  slug: '',
  coverImage: '',
  categories: [] as string[],
  tags: [] as string[],
  summary: '',
  content: '',
  rawContent: '',
  format: 'markdown' as 'markdown' | 'html',
  siyuanId: '' // 当前关联的思源笔记 ID
});

// 视图模式：halo 文章列表 | 思源笔记列表
const viewMode = ref<'halo' | 'siyuan'>('halo');

// 已发布文章列表
const publishedPosts = ref<any[]>([]);

// 思源笔记列表
const siyuanNotes = ref<SiyuanNoteItem[]>([]);

// 文章搜索和筛选
const postSearchQuery = ref('');
const filterCategory = ref('');
const filterTag = ref('');
const filterSource = ref('');

// 思源笔记搜索和筛选
const siyuanSearchQuery = ref('');
const siyuanFilterCategory = ref('');
const siyuanFilterTag = ref('');

// 编辑对话框状态
const showEditDialog = ref(false);
const isSaving = ref(false);

// 操作加载状态
const isRefreshing = ref(false);    // 刷新文章列表
const isDeleting = ref<string>(''); // 正在删除的文章 ID
const isUpdating = ref<string>(''); // 正在更新的笔记 ID
const editingPostId = ref('');
const editForm = reactive({
  title: '',
  slug: '',
  categories: [] as string[],
  tags: [] as string[],
  // 发布选项
  allowComment: true,
  pinned: false,
  visible: 'PUBLIC' as 'PUBLIC' | 'PRIVATE'
});

// 分类和标签
const categories = ref<Category[]>([]);
const tags = ref<Tag[]>([]);
const selectedCategories = ref<string[]>([]);
const selectedTags = ref<string[]>([]);
const newCategoryName = ref('');
const newTagName = ref('');

// 别名选项
const slugOptions = reactive<SlugOptions>({
  autoGenerate: true,
  mode: 'timestamp',  // 默认使用时间戳模式
  separator: '-',
  lowercase: true,
  useChinese: false
});

// 格式调整选项
const formatOptions = reactive({
  removeH1: true,
  autoGenerateSlug: true,
  optimizeImages: true
});

// 存储策略
const storagePolicies = ref<{ id: string; name: string; templateName: string }[]>([]);
const selectedStoragePolicy = ref<string>(''); // 默认存储策略
const publishStoragePolicy = ref<string>(''); // 发布时指定的存储策略（可覆盖默认）
const isLoadingPolicies = ref(false);

// 发布选项
const publishOptions = reactive({
  allowComment: true,   // 允许评论，默认开启
  pinned: false,        // 置顶，默认关闭
  visible: 'PUBLIC' as 'PUBLIC' | 'PRIVATE' // 可见性，默认公开
});

// 当默认存储策略改变时，同步到发布页面
// 使用 immediate: true 确保加载时也同步
watch(selectedStoragePolicy, (newValue) => {
  publishStoragePolicy.value = newValue;
}, { immediate: true });

// 预览模式
const previewMode = ref<'edit' | 'preview'>('edit');

// 消息提示
const message = ref('');
const messageType = ref<'success' | 'error' | 'info'>('info');
const noteFetchError = ref('');

// 发布进度状态
const isPublishing = ref(false);
const publishProgress = ref(0);
const publishStep = ref('');

// 计算属性：配置是否有效
const isConfigValid = computed(() => {
  return !!configForm.url && !!configForm.cookie;
});

// 计算属性：文章表单是否有效
const isPostFormValid = computed(() => {
  return !!postForm.title && !!postForm.content;
});

// 计算属性：渲染后的内容（用于预览）
const renderedContent = computed(() => {
  if (!postForm.content) return '<p style="color: #999;">暂无内容</p>';
  
  // 简单的 Markdown 转 HTML（基础实现）
  let html = postForm.content
    // 转义 HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 标题
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // 粗体和斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 代码块
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // 图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;">')
    // 列表
    .replace(/^\* (.*)$/gm, '<li>$1</li>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
    // 段落
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return '<p>' + html + '</p>';
});

// 计算属性：筛选后的文章列表
const filteredPosts = computed(() => {
  let result = publishedPosts.value;
  
  // 标题搜索
  if (postSearchQuery.value.trim()) {
    const query = postSearchQuery.value.toLowerCase();
    result = result.filter(post => 
      post.title.toLowerCase().includes(query)
    );
  }
  
  // 分类筛选
  if (filterCategory.value) {
    result = result.filter(post => 
      post.categories?.includes(filterCategory.value)
    );
  }
  
  // 标签筛选
  if (filterTag.value) {
    result = result.filter(post => 
      post.tags?.includes(filterTag.value)
    );
  }
  
  // 来源筛选
  if (filterSource.value) {
    result = result.filter(post => 
      post.source === filterSource.value
    );
  }
  
  return result;
});

// 计算属性：筛选后的思源笔记列表
const filteredSiyuanNotes = computed(() => {
  let result = siyuanNotes.value;
  
  // 标题搜索
  if (siyuanSearchQuery.value.trim()) {
    const query = siyuanSearchQuery.value.toLowerCase();
    result = result.filter(item => 
      item.title.toLowerCase().includes(query)
    );
  }
  
  // 分类筛选
  if (siyuanFilterCategory.value) {
    result = result.filter(item => 
      item.categories?.includes(siyuanFilterCategory.value)
    );
  }
  
  // 标签筛选
  if (siyuanFilterTag.value) {
    result = result.filter(item => 
      item.tags?.includes(siyuanFilterTag.value)
    );
  }
  
  return result;
});

// 保存配置
const saveConfig = async () => {
  try {
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    
    // 使用插件 API 保存
    const plugin = (window as any).haloPublisherPlugin;
    if (plugin && plugin.savePluginData) {
      await plugin.savePluginData('config', config);
    } else {
      // 回退到 localStorage
      saveLocalConfig(config);
    }
    
    showMessage(t('msg.configSaved'), 'success');
    // 保存配置后加载分类、标签和存储策略
    await loadTaxonomies();
    await loadStoragePolicies();
  } catch (error) {
    console.error('保存配置失败:', error);
    showMessage(t('msg.saveFailed'), 'error');
  }
};

// 加载保存的配置
onMounted(async () => {
  try {
    const plugin = (window as any).haloPublisherPlugin;
    let savedConfig = null;
    
    if (plugin && plugin.loadPluginData) {
      savedConfig = await plugin.loadPluginData('config');
    }
    
    // 如果插件存储中没有，尝试从 localStorage 读取（兼容旧数据）
    if (!savedConfig) {
      savedConfig = loadConfig();
    }

    if (savedConfig) {
      configForm.url = savedConfig.url || '';
      configForm.cookie = savedConfig.cookie || '';
      
      // 自动检查授权
      if (configForm.url && configForm.cookie) {
        // 等待一下 UI 渲染
        setTimeout(() => {
          loadTaxonomies();
          loadStoragePolicies();
        }, 500);
      }
    }
  } catch (error) {
    console.error('加载配置失败:', error);
  }
  
  // 初始化发布记录存储
  await PublishStore.init();
  
  // 初始化图片上传缓存
  await ImageCacheStore.init();
  
  // 加载格式调整选项
  loadFormatOptions();

  // 自动检查连接状态（如果配置有效）
  if (isConfigValid.value) {
    // 使用 setTimeout 延迟执行，确保不阻塞 UI 加载
    setTimeout(() => {
      recheckAuth();
    }, 500);
  }

  // 使用 props 中的 initialTab 或从 URL 参数获取
  if (props.initialTab && tabs.value.some((tabItem: { id: string }) => tabItem.id === props.initialTab)) {
    switchTab(props.initialTab);
  } else {
    // 兼容 iframe 模式，从 URL 参数获取
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && tabs.value.some((tabItem: { id: string }) => tabItem.id === tab)) {
      switchTab(tab);
    }
  }
});

// 标签页切换方法
const switchTab = (tabId: string) => {
  activeTab.value = tabId;
  
  // 如果切换到文章发布或文章管理标签页，加载分类和标签
  if ((tabId === 'articlePublish' || tabId === 'articleManagement') && configForm.url && configForm.cookie) {
    loadTaxonomies();
  }
  
  // 如果切换到文章管理标签页，自动加载文章列表
  if (tabId === 'articleManagement' && configForm.url && configForm.cookie) {
    fetchPublishedPosts();
  }
};

// 监听标题变化，自动生成别名
watch(() => postForm.title, (newTitle) => {
  if (formatOptions.autoGenerateSlug && slugOptions.autoGenerate && newTitle) {
    postForm.slug = SlugUtils.generateSlug(newTitle, slugOptions);
  }
});

// 监听视图模式变化
watch(viewMode, (newMode) => {
  if (configForm.url && configForm.cookie) {
    if (newMode === 'halo') {
      fetchPublishedPosts();
    } else if (newMode === 'siyuan') {
      fetchSiyuanNotes();
    }
  }
});

// 监听配置变化，加载分类和标签
watch(() => [configForm.url, configForm.cookie], async ([newUrl, newCookie]) => {
  if (newUrl && newCookie) {
    await loadTaxonomies();
  }
}, { deep: true });

// 加载格式调整选项（使用插件存储 API）
const loadFormatOptions = async () => {
  try {
    const plugin = (window as any).haloPublisherPlugin;
    
    if (plugin && plugin.loadPluginData) {
      // 使用插件存储 API
      const savedFormatOptions = await plugin.loadPluginData('format-options');
      if (savedFormatOptions) {
        Object.assign(formatOptions, savedFormatOptions);
      }
      
      const savedSlugOptions = await plugin.loadPluginData('slug-options');
      if (savedSlugOptions) {
        Object.assign(slugOptions, savedSlugOptions);
      }

      const savedShowDebug = await plugin.loadPluginData('show-debug');
      if (savedShowDebug !== null && savedShowDebug !== undefined) {
        showDebug.value = savedShowDebug;
      }

      const savedLanguage = await plugin.loadPluginData('language');
      if (savedLanguage && ['zh-CN', 'zh-TW', 'en'].includes(savedLanguage)) {
        setLanguage(savedLanguage);
      }

      const savedStoragePolicy = await plugin.loadPluginData('storage-policy');
      if (savedStoragePolicy) {
        selectedStoragePolicy.value = savedStoragePolicy;
      }
    } else {
      // 降级到 localStorage
      const savedFormatOptions = localStorage.getItem('halo-publisher-format-options');
      if (savedFormatOptions) {
        Object.assign(formatOptions, JSON.parse(savedFormatOptions));
      }
      
      const savedSlugOptions = localStorage.getItem('halo-publisher-slug-options');
      if (savedSlugOptions) {
        Object.assign(slugOptions, JSON.parse(savedSlugOptions));
      }

      const savedShowDebug = localStorage.getItem('halo-publisher-show-debug');
      if (savedShowDebug) {
        showDebug.value = JSON.parse(savedShowDebug);
      }
    }
  } catch (error) {
    console.error('加载格式设置失败:', error);
  }
};

// 保存格式调整选项（使用插件存储 API）
const saveFormatOptions = async () => {
  try {
    const plugin = (window as any).haloPublisherPlugin;
    
    if (plugin && plugin.savePluginData) {
      // 使用插件存储 API
      await plugin.savePluginData('format-options', { ...formatOptions });
      await plugin.savePluginData('slug-options', { ...slugOptions });
      await plugin.savePluginData('show-debug', showDebug.value);
      await plugin.savePluginData('language', currentLanguage.value);
      await plugin.savePluginData('storage-policy', selectedStoragePolicy.value);
    } else {
      // 降级到 localStorage
      localStorage.setItem('halo-publisher-format-options', JSON.stringify(formatOptions));
      localStorage.setItem('halo-publisher-slug-options', JSON.stringify(slugOptions));
      localStorage.setItem('halo-publisher-show-debug', JSON.stringify(showDebug.value));
    }
    showMessage(t('msg.settingsSaved'), 'success');
  } catch (error) {
    showMessage(t('msg.saveFailed') + '：' + (error instanceof Error ? error.message : ''), 'error');
  }
};

// 语言切换处理
const onLanguageChange = async (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const newLang = target.value as Language;
  setLanguage(newLang);
  
  // 保存语言设置到插件存储
  const plugin = (window as any).haloPublisherPlugin;
  if (plugin && plugin.savePluginData) {
    await plugin.savePluginData('language', newLang);
  }
};






// 重新检查授权状态
const recheckAuth = async () => {
  if (!configForm.url) {
    showMessage(t('msg.urlRequired'), 'error');
    return;
  }

  isCheckingAuth.value = true;
  
  try {
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    const adaptor = new HalowebWebAdaptor(config);
    const isValid = await adaptor.checkCookieValidity();
    
    if (isValid) {
      authStatus.value = 'valid';
      showMessage(t('msg.authValid'), 'success');
    } else {
      authStatus.value = 'expired';
      showMessage(t('msg.authExpired'), 'error');
    }
  } catch (error) {
    console.error('检查授权状态失败:', error);
    authStatus.value = 'unknown';
    showMessage(t('msg.checkFailed'), 'error');
  } finally {
    isCheckingAuth.value = false;
  }
};

// 打开 Halo 后台
const openHaloConsole = () => {
  if (!configForm.url) {
    showMessage(t('msg.urlRequired'), 'error');
    return;
  }
  
  let consoleUrl = configForm.url.trim();
  if (consoleUrl.endsWith('/')) {
    consoleUrl = consoleUrl.slice(0, -1);
  }
  consoleUrl += '/console';
  
  window.open(consoleUrl, '_blank');
  showMessage(t('msg.haloConsoleOpened'), 'info');
};

// 保存并验证 Cookie
const saveAndVerifyCookie = async () => {
  // 先保存
  saveConfig();
  
  // 然后验证
  await recheckAuth();
};

// 自动获取 Cookie（使用 Electron 窗口）
const autoGetCookie = async () => {
  if (!configForm.url) {
    showMessage(t('msg.urlRequired'), 'error');
    return;
  }

  // 获取插件实例
  const plugin = (window as any).haloPublisherPlugin;
  if (!plugin || !plugin.openLoginWindow) {
    showMessage(t('msg.cannotAutoGet'), 'error');
    openHaloConsole();
    return;
  }

  isGettingCookie.value = true;
  showMessage(t('msg.openingLogin'), 'info');

  try {
    const cookie = await plugin.openLoginWindow(configForm.url);
    if (cookie) {
      configForm.cookie = cookie;
      saveConfig();
      showMessage(t('msg.cookieSuccess'), 'success');
      // 验证
      await recheckAuth();
    }
  } catch (error) {
    console.error('自动获取 Cookie 失败:', error);
    showMessage(t('msg.cookieFailed') + ': ' + (error instanceof Error ? error.message : t('msg.unknownError')), 'error');
  } finally {
    isGettingCookie.value = false;
  }
};

// 加载分类和标签
const loadTaxonomies = async () => {
  if (!isConfigValid.value) {
    return;
  }
  
  try {
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    const adaptor = new HalowebWebAdaptor(config);
    
    // 并行加载分类和标签
    const [categoriesResult, tagsResult] = await Promise.all([
      adaptor.getCategories(),
      adaptor.getTags()
    ]);
    
    categories.value = categoriesResult;
    tags.value = tagsResult;
    
    showMessage(t('msg.taxonomyLoaded'), 'success');
  } catch (error) {
    console.error('加载分类标签失败:', error);
    // 这里不显示错误消息，避免影响用户体验
  }
};

// 加载存储策略列表
const loadStoragePolicies = async () => {
  if (!isConfigValid.value) {
    return;
  }
  
  isLoadingPolicies.value = true;
  try {
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    const adaptor = new HalowebWebAdaptor(config);
    
    const policies = await adaptor.getStoragePolicies();
    storagePolicies.value = policies;
    console.log('[HaloPublisher] Loaded storage policies:', policies);
  } catch (error) {
    console.error('加载存储策略失败:', error);
    storagePolicies.value = [];
  } finally {
    isLoadingPolicies.value = false;
  }
};

// 获取当前思源笔记内容
const fetchCurrentNote = async () => {
  try {
    noteFetchError.value = '';
    const note = await SiyuanUtils.getCurrentDoc();
    
    // 解析笔记内容
    const parsedNote = SiyuanUtils.parseNoteContent(note.content);
    
    // 填充表单
    postForm.title = parsedNote.title;
    postForm.content = parsedNote.parsedContent;
    postForm.rawContent = note.rawContent;
    postForm.coverImage = note.coverImage || '';
    postForm.format = note.format;
    postForm.siyuanId = note.id;
    
    // 自动生成别名
    if (slugOptions.autoGenerate) {
      postForm.slug = SlugUtils.generateSlug(parsedNote.title, slugOptions);
    }
    
    showMessage(t('msg.fetchNoteSuccess'), 'success');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '获取笔记内容失败';
    noteFetchError.value = errorMsg;
    showMessage(errorMsg, 'error');
  }
};

// 切换分类选择
const toggleCategory = (categoryId: string) => {
  const index = selectedCategories.value.indexOf(categoryId);
  if (index > -1) {
    selectedCategories.value.splice(index, 1);
  } else {
    selectedCategories.value.push(categoryId);
  }
};

// 切换标签选择
const toggleTag = (tagId: string) => {
  const index = selectedTags.value.indexOf(tagId);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else {
    selectedTags.value.push(tagId);
  }
};

// 添加新分类
const addNewCategory = async () => {
  if (!newCategoryName.value.trim() || !isConfigValid.value) {
    return;
  }
  
  try {
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    const adaptor = new HalowebWebAdaptor(config);
    
    const newCategory = await adaptor.createCategory(newCategoryName.value.trim());
    categories.value.push(newCategory);
    selectedCategories.value.push(newCategory.id);
    newCategoryName.value = '';
    
    showMessage(t('msg.categoryCreated'), 'success');
  } catch (error) {
    showMessage(t('msg.createCategoryFailed') + '：' + (error instanceof Error ? error.message : t('msg.unknownError')), 'error');
  }
};

// 添加新标签
const addNewTag = async () => {
  if (!newTagName.value.trim() || !isConfigValid.value) {
    return;
  }
  
  try {
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    const adaptor = new HalowebWebAdaptor(config);
    
    const newTag = await adaptor.createTag(newTagName.value.trim());
    tags.value.push(newTag);
    selectedTags.value.push(newTag.id);
    newTagName.value = '';
    
    showMessage(t('msg.tagCreated'), 'success');
  } catch (error) {
    showMessage(t('msg.createTagFailed') + '：' + (error instanceof Error ? error.message : t('msg.unknownError')), 'error');
  }
};

// 发布文章
const publishPost = async () => {
  if (!isConfigValid.value || !isPostFormValid.value) {
    return;
  }
  
  // 检查封面图片
  if (!postForm.coverImage) {
    if (!confirm('当前文章没有封面图片，确定要继续发布吗？')) {
      return;
    }
  }
  
  // 开始发布，初始化进度
  isPublishing.value = true;
  publishProgress.value = 0;
  publishStep.value = t('publish.stepPrepare');
  
  try {
    // 进度 10%: 初始化配置
    publishProgress.value = 10;
    publishStep.value = t('publish.stepConfig');
    
    // 确定使用的存储策略：优先使用发布页面选择的，否则使用全局设置
    const effectiveStoragePolicy = publishStoragePolicy.value || selectedStoragePolicy.value;
    console.log('[HaloPublisher] Using storage policy for publish:', effectiveStoragePolicy || 'default-policy');
    
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    // 添加存储策略到配置
    if (effectiveStoragePolicy) {
      config.storagePolicyName = effectiveStoragePolicy;
    }
    const adaptor = new HalowebWebAdaptor(config);
    
    // 进度 20%: 处理分类和标签
    publishProgress.value = 20;
    publishStep.value = t('publish.stepTaxonomy');
    
    // Halo API 需要 metadata.name 而非 displayName
    const selectedCategoryIds = categories.value
      .filter(cat => selectedCategories.value.includes(cat.id))
      .map(cat => cat.id);
    
    const selectedTagIds = tags.value
      .filter(tag => selectedTags.value.includes(tag.id))
      .map(tag => tag.id);
    
    // 进度 30%: 处理内容
    publishProgress.value = 30;
    publishStep.value = t('publish.stepContent');
    
    let processedContent = postForm.content;
    if (formatOptions.removeH1) {
      const h1Match = processedContent.match(/^#\s+(.*)$/m);
      if (h1Match && h1Match[1]) {
        const h1Title = h1Match[1].trim();
        const articleTitle = postForm.title.trim();
        if (h1Title === articleTitle) {
          processedContent = processedContent.replace(/^#\s+.*$/m, '').trim();
        }
      }
    }

    // 进度 40%: 构建文章数据
    publishProgress.value = 40;
    publishStep.value = t('publish.stepBuild');

    const post: Post = {
      metadata: {
        title: postForm.title,
        slug: postForm.slug,
        status: 'PUBLISHED',
        publishTime: new Date().toISOString(),
        coverImage: postForm.coverImage,
        categories: selectedCategoryIds,
        tags: selectedTagIds,
        summary: postForm.summary,
        // 发布选项
        allowComment: publishOptions.allowComment,
        pinned: publishOptions.pinned,
        visible: publishOptions.visible
      },
      content: {
        content: processedContent,
        rawContent: postForm.rawContent || postForm.content,
        format: postForm.format
      }
    };
    
    // 进度 50%: 开始发布（上传图片会在内部进行）
    publishProgress.value = 50;
    publishStep.value = t('publish.stepUpload');
    
    const postId = await adaptor.publishPost(post);
    
    // 进度 90%: 发布成功
    publishProgress.value = 90;
    publishStep.value = t('publish.stepSave');

    // 如果有关联的思源笔记 ID，保存发布记录
    if (postForm.siyuanId) {
      await PublishStore.saveRecord({
        siyuanId: postForm.siyuanId,
        haloId: postId,
        contentHash: PublishStore.computeContentHash(postForm.rawContent || postForm.content),
        publishedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        title: postForm.title
      });
    }

    publishStep.value = t('publish.stepRefresh');
    
    // 清空表单
    clearPostForm();
    
    // 刷新文章列表
    await fetchPublishedPosts();
    
    // 进度 100%: 完成
    publishProgress.value = 100;
    publishStep.value = t('publish.stepDone');
    
    showMessage(t('msg.publishSuccess'), 'success');
    
    // 延迟隐藏进度条
    setTimeout(() => {
      isPublishing.value = false;
      publishProgress.value = 0;
      publishStep.value = '';
    }, 1500);
    
  } catch (error) {
    showMessage(t('msg.publishFailed') + '：' + (error instanceof Error ? error.message : t('msg.unknownError')), 'error');
    isPublishing.value = false;
    publishProgress.value = 0;
    publishStep.value = '';
  }
};

// 清空文章表单
const clearPostForm = () => {
  postForm.title = '';
  postForm.slug = '';
  postForm.coverImage = '';
  postForm.categories = [];
  postForm.tags = [];
  postForm.summary = '';
  postForm.content = '';
  postForm.rawContent = '';
  postForm.format = 'markdown';
  
  selectedCategories.value = [];
  selectedTags.value = [];
  noteFetchError.value = '';
};

// 获取已发布文章列表
const fetchPublishedPosts = async () => {
  if (!isConfigValid.value) {
    showMessage(t('msg.configFirst'), 'error');
    return;
  }
  
  isRefreshing.value = true;
  try {
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    const adaptor = new HalowebWebAdaptor(config);
    
    const posts = await adaptor.getPublishedPosts();
    
    // 标记文章来源
    publishedPosts.value = posts.map(post => ({
      ...post,
      source: PublishStore.isPluginPublished(post.id) ? 'plugin' : 'halo'
    }));
    showMessage(t('msg.listRefreshed'), 'success');
  } catch (error) {
    showMessage(t('msg.loadFailed') + '：' + (error instanceof Error ? error.message : t('msg.unknownError')), 'error');
  } finally {
    isRefreshing.value = false;
  }
};

// 打开编辑对话框
const openEditDialog = (post: any) => {
  editingPostId.value = post.id;
  editForm.title = post.title;
  editForm.slug = post.slug || '';
  editForm.categories = post.categories || [];
  editForm.tags = post.tags || [];
  // 发布选项（从文章详情中获取，默认值为标准默认值）
  editForm.allowComment = post.allowComment ?? true;
  editForm.pinned = post.pinned ?? false;
  editForm.visible = post.visible ?? 'PUBLIC';
  showEditDialog.value = true;
};

// 关闭编辑对话框
const closeEditDialog = () => {
  showEditDialog.value = false;
  editingPostId.value = '';
  editForm.title = '';
  editForm.slug = '';
  editForm.categories = [];
  editForm.tags = [];
  // 重置发布选项为默认值
  editForm.allowComment = true;
  editForm.pinned = false;
  editForm.visible = 'PUBLIC';
};

// 切换编辑表单中的分类
const toggleEditCategory = (catName: string) => {
  const index = editForm.categories.indexOf(catName);
  if (index > -1) {
    editForm.categories.splice(index, 1);
  } else {
    editForm.categories.push(catName);
  }
};

// 切换编辑表单中的标签
const toggleEditTag = (tagName: string) => {
  const index = editForm.tags.indexOf(tagName);
  if (index > -1) {
    editForm.tags.splice(index, 1);
  } else {
    editForm.tags.push(tagName);
  }
};

// 保存编辑表单
const saveEditForm = async () => {
  if (!editingPostId.value) return;
  
  isSaving.value = true;
  try {
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    const adaptor = new HalowebWebAdaptor(config);
    
    await adaptor.updatePostMetadata(editingPostId.value, {
      title: editForm.title,
      slug: editForm.slug,
      categories: editForm.categories,
      tags: editForm.tags,
      // 发布选项
      allowComment: editForm.allowComment,
      pinned: editForm.pinned,
      visible: editForm.visible
    });
    
    showMessage(t('msg.updateSuccess'), 'success');
    closeEditDialog();
    
    // 刷新文章列表
    await fetchPublishedPosts();
  } catch (error) {
    showMessage(t('msg.updateFailed') + '：' + (error instanceof Error ? error.message : t('msg.unknownError')), 'error');
  } finally {
    isSaving.value = false;
  }
};

// 获取思源笔记列表
const fetchSiyuanNotes = async () => {
  try {
    const records = PublishStore.getAllRecords();
    const notes: SiyuanNoteItem[] = [];

    for (const record of records) {
      try {
        const doc = await SiyuanUtils.getDocById(record.siyuanId);
        const currentHash = PublishStore.computeContentHash(doc.rawContent);
        
        // 从 publishedPosts 中获取分类和标签信息
        const haloPost = publishedPosts.value.find(p => p.id === record.haloId);
        
        notes.push({
          id: record.siyuanId,
          title: record.title,
          updated: doc.updatedAt,
          haloId: record.haloId,
          isModified: currentHash !== record.contentHash,
          isPublished: true,
          isDeleted: !haloPost, // 标记是否在 Halo 列表中找不到（已删除）
          categories: haloPost?.categories || [],
          categoryNames: haloPost?.categoryNames || [],
          tags: haloPost?.tags || [],
          tagNames: haloPost?.tagNames || []
        });
      } catch (e) {
        console.warn(`Failed to fetch doc ${record.siyuanId}`, e);
        // 如果获取失败（可能已删除），仍然显示记录，但标记状态
        notes.push({
          id: record.siyuanId,
          title: record.title + ' (无法访问)',
          updated: record.lastUpdated,
          haloId: record.haloId,
          isPublished: true
        });
      }
    }
    
    siyuanNotes.value = notes;
  } catch (error) {
    console.error('获取思源笔记列表失败:', error);
    showMessage(t('msg.loadFailed'), 'error');
  }
};

// 更新思源笔记内容到 Halo
const updateToHalo = async (noteItem: SiyuanNoteItem) => {
  if (!noteItem.haloId) return;
  
  isUpdating.value = noteItem.id;
  try {
    const doc = await SiyuanUtils.getDocById(noteItem.id);
    
    // 使用全局默认存储策略（更新时使用与新发布相同的策略）
    const effectiveStoragePolicy = selectedStoragePolicy.value;
    console.log('[HaloPublisher] Using storage policy for update:', effectiveStoragePolicy || 'default-policy');
    
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    // 添加存储策略到配置
    if (effectiveStoragePolicy) {
      config.storagePolicyName = effectiveStoragePolicy;
    }
    const adaptor = new HalowebWebAdaptor(config);
    
    await adaptor.updatePostContent(noteItem.haloId, doc.title, doc.rawContent, doc.coverImage);
    
    // 更新记录
    await PublishStore.saveRecord({
      siyuanId: noteItem.id,
      haloId: noteItem.haloId,
      contentHash: PublishStore.computeContentHash(doc.rawContent),
      publishedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      title: doc.title
    });
    
    showMessage(t('msg.updateSuccess'), 'success');
    await fetchSiyuanNotes(); // 刷新状态
  } catch (error) {
    showMessage(t('msg.updateFailed') + '：' + (error instanceof Error ? error.message : t('msg.unknownError')), 'error');
  } finally {
    isUpdating.value = '';
  }
};

// 删除文章
const deletePost = async (postId: string) => {
  if (!confirm('确定要删除这篇文章吗？此操作将把文章移入回收站。')) {
    return;
  }
  
  isDeleting.value = postId;
  try {
    const config = useHalowebWeb({
      url: configForm.url,
      cookie: configForm.cookie
    });
    const adaptor = new HalowebWebAdaptor(config);
    
    await adaptor.deletePost(postId);
    showMessage(t('msg.deleteSuccess'), 'success');
    
    // 刷新文章列表
    await fetchPublishedPosts();
  } catch (error) {
    showMessage(t('msg.deleteFailed') + '：' + (error instanceof Error ? error.message : t('msg.unknownError')), 'error');
  } finally {
    isDeleting.value = '';
  }
};

// 移除关联记录（不删除 Halo 文章）
const removeAssociation = async (noteItem: SiyuanNoteItem) => {
  if (!confirm('确定要删除这条发布记录吗？\n注意：这不会删除 Halo 上的文章（如果还存在的话），仅删除本地的同步记录。')) {
    return;
  }

  try {
    await PublishStore.removeRecord(noteItem.id);
    showMessage(t('msg.recordDeleted'), 'success');
    await fetchSiyuanNotes(); // 刷新列表
  } catch (error) {
    showMessage(t('msg.deleteFailed') + '：' + (error instanceof Error ? error.message : t('msg.unknownError')), 'error');
  }
};

// 显示消息
const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
  message.value = msg;
  messageType.value = type;
  
  // 3秒后自动关闭消息
  setTimeout(() => {
    clearMessage();
  }, 3000);
};

// 清除消息
const clearMessage = () => {
  message.value = '';
  messageType.value = 'info';
};

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  
  // 处理思源笔记的日期格式 (YYYYMMDDHHmmss)
  if (/^\d{14}$/.test(dateString)) {
    const year = dateString.slice(0, 4);
    const month = dateString.slice(4, 6);
    const day = dateString.slice(6, 8);
    const hour = dateString.slice(8, 10);
    const minute = dateString.slice(10, 12);
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
  
  // 标准日期格式
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

// 暴露方法给外部访问
defineExpose({
  switchTab
});
</script>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f5f5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 标签页样式 */
.tabs {
  display: flex;
  background-color: white;
  border-bottom: 1px solid #eaeaea;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: 0 20px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #606266;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
}

.tab-item:hover {
  color: #409eff;
  background-color: #f0f9ff;
}

.tab-item.active {
  color: #409eff;
  border-bottom-color: #409eff;
  background-color: #ecf5ff;
}

.tab-icon {
  font-size: 16px;
}

.tab-text {
  white-space: nowrap;
}

/* 标签页内容 */
.tab-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.tab-title {
  color: #333;
  margin-bottom: 24px;
  font-size: 20px;
  font-weight: 600;
}

/* 通用卡片样式 */
.publish-section,
.published-section,
.settings-section,
.about-section {
  background-color: white;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.publish-section h3,
.published-section h3,
.settings-section h3 {
  color: #444;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
}

/* 表单网格布局 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin: 15px 0;
}

/* 分类标签网格布局 */
.taxonomy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 15px 0;
}

/* 视图切换样式 */
.view-switcher {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  background: #f1f2f3;
  padding: 4px;
  border-radius: 8px;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

.view-btn {
  padding: 8px 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  transition: all 0.3s;
}

.view-btn.active {
  background: white;
  color: #409eff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 状态徽章 */
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 4px;
}

.status-modified {
  background: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #faecd8;
}

.status-synced {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

/* 表格样式 */
.posts-table {
  margin-top: 15px;
  overflow-x: auto;
}

.posts-table table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.posts-table th,
.posts-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #ebeef5;
  vertical-align: middle;
  line-height: 1.5;
  box-sizing: border-box;
}

.posts-table tbody tr:last-child td {
  border-bottom: none;
}

/* 针对操作列的样式修复 */
.posts-table th:last-child,
.posts-table td:last-child {
  text-align: center;
  min-width: 120px;
}

.posts-table th {
  background-color: #fafafa;
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.posts-table tbody tr:hover {
  background-color: #f5f7fa;
}

.post-title-cell {
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-title-link {
  color: #409eff;
  text-decoration: none;
  transition: all 0.3s ease;
}

.post-title-link:hover {
  text-decoration: underline;
  color: #66b1ff;
}

.source-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 4px;
}

.source-plugin {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.source-halo {
  background: #f4f4f5;
  color: #909399;
  border: 1px solid #e9e9eb;
}

.action-buttons {
  text-align: center;
}

.action-buttons button {
  margin: 0 4px;
}

/* 部分标题样式 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

/* 筛选工具栏样式 */
.filter-toolbar {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #409eff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  min-width: 120px;
}

.language-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  min-width: 150px;
  cursor: pointer;
}

.language-select:focus {
  border-color: #409eff;
  outline: none;
}

.setting-control {
  margin-top: 8px;
}

.setting-label {
  font-weight: 600;
  color: #303133;
  display: block;
  margin-bottom: 4px;
}

/* 标签徽章样式 */
.tag-badge {
  display: inline-block;
  padding: 2px 8px;
  margin: 2px;
  font-size: 12px;
  background: #e8f4ff;
  color: #409eff;
  border-radius: 10px;
}

.cat-badge {
  background: #f0f9eb;
  color: #67c23a;
}

.no-data {
  color: #ccc;
}

/* 模态对话框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

/* 编辑对话框样式 */
.edit-dialog {
  max-width: 550px;
}

.edit-warning {
  background: #fff7e6;
  border: 1px solid #ffc53d;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #ad6800;
  line-height: 1.5;
}

.warning-icon {
  flex-shrink: 0;
}

.edit-form-group {
  margin-bottom: 20px;
}

.edit-label {
  display: block;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  font-size: 14px;
}

.edit-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.edit-input:focus {
  border-color: #409eff;
  outline: none;
}

.taxonomy-edit-box {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  min-height: 40px;
}

.taxonomy-edit-item {
  padding: 6px 14px;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 16px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  transition: all 0.2s;
}

.taxonomy-edit-item:hover {
  border-color: #409eff;
  color: #409eff;
}

.taxonomy-edit-item.selected {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.taxonomy-edit-item.tag-item.selected {
  background: #f0f9eb;
  border-color: #67c23a;
  color: #67c23a;
}

.taxonomy-empty {
  color: #909399;
  font-size: 13px;
  width: 100%;
  text-align: center;
  padding: 10px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
  max-height: 150px;
  overflow-y: auto;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
}

/* 设置项样式 */
.settings-section {
  margin-bottom: 20px;
}

.setting-item {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 6px;
  border: 1px solid #eaeaea;
  transition: all 0.3s ease;
}

.setting-item:hover {
  background-color: #f0f9ff;
  border-color: #91d5ff;
}

.setting-info {
  margin-bottom: 12px;
}

.setting-description {
  font-size: 13px;
  color: #909394;
  margin-top: 6px;
  line-height: 1.5;
}

.setting-options {
  display: flex;
  gap: 20px;
  padding-left: 24px;
}

/* 帮助文本样式 */
.help-text {
  font-size: 13px;
  color: #909394;
  margin-top: 6px;
  line-height: 1.5;
}

/* 关于页面样式 */
.about-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eaeaea;
}

.about-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.version {
  color: #909394;
  font-size: 14px;
}

.about-content {
  line-height: 1.6;
  color: #606266;
}

.about-content h4 {
  margin: 20px 0 12px 0;
  color: #333;
  font-size: 16px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 12px 0;
}

.feature-list li {
  margin-bottom: 10px;
  padding-left: 24px;
  position: relative;
}

.feature-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  width: 16px;
  height: 16px;
  background-color: #ecf5ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #409eff;
}

.author-info p {
  margin: 8px 0;
}

.author-info a {
  color: #409eff;
  text-decoration: none;
}

.author-info a:hover {
  text-decoration: underline;
}

/* 表单基础样式 */
.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

/* 内容区域标题和切换按钮 */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.content-tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #e8e8e8;
}

.tab-btn.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

/* 内容预览区域 */
.content-preview {
  min-height: 280px;
  max-height: 400px;
  overflow-y: auto;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fafafa;
  line-height: 1.6;
}

.content-preview h1,
.content-preview h2,
.content-preview h3 {
  margin: 16px 0 8px 0;
  color: #333;
}

.content-preview h1 { font-size: 1.5em; }
.content-preview h2 { font-size: 1.3em; }
.content-preview h3 { font-size: 1.1em; }

.content-preview p { margin: 8px 0; }

.content-preview code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

.content-preview pre {
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}

.content-preview pre code {
  background: transparent;
  padding: 0;
}

.content-preview a {
  color: #409eff;
}

.content-preview img {
  max-width: 100%;
  border-radius: 4px;
  margin: 8px 0;
}

.content-preview li {
  margin-left: 20px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 错误和警告消息 */
.error-message {
  color: #f56c6c;
  margin-top: 10px;
  font-size: 14px;
}

.warning-message {
  color: #e6a23c;
  margin-top: 5px;
  font-size: 12px;
}

/* 按钮组 */
.button-group {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* 发布进度条 */
.publish-progress {
  margin-top: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%);
  border-radius: 8px;
  border: 1px solid #d0e5ff;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-step {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.progress-percent {
  font-size: 14px;
  color: #409eff;
  font-weight: 600;
}

.progress-bar {
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff 0%, #66b1ff 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.btn-primary,
.btn-secondary,
.btn-link,
.btn-small {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn-primary {
  background-color: #409eff;
  color: white;
}

.btn-primary:hover {
  background-color: #66b1ff;
}

.btn-primary:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-link {
  background-color: transparent;
  color: #409eff;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
  background-color: #409eff;
  color: white;
  line-height: normal; /* 防止按钮行高影响 */
  min-height: 24px;    /* 确保按钮高度一致 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-small:hover {
  background-color: #66b1ff;
}

.btn-small.btn-danger {
  background-color: #f56c6c;
}

.btn-small.btn-danger:hover {
  background-color: #f78989;
}

/* 复选框样式 */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  cursor: pointer;
  color: #555;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

/* 发布选项网格样式 */
.publish-options-grid {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 14px 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #495057;
}

.option-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  accent-color: #409eff;
}

.option-item label {
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

.option-item select {
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  min-width: 80px;
}

.option-item select:focus {
  border-color: #409eff;
  outline: none;
}

/* 编辑对话框发布选项样式 */
.edit-publish-options {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 10px 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.visibility-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #555;
}

.visibility-dropdown-small {
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: white;
}

/* 单选按钮组样式 */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  color: #555;
  user-select: none;
}

.radio-label input[type="radio"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

/* 别名模式选项样式 */
.slug-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slug-mode-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.slug-mode-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: white;
  border: 1px solid transparent;
}

.slug-mode-item:hover {
  background-color: #f0f7ff;
}

.slug-mode-item.active {
  background-color: #e6f4ff;
  border-color: #409eff;
}

.slug-mode-item input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  accent-color: #409eff;
}

.slug-mode-item .mode-text {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.slug-mode-item .mode-hint {
  font-size: 12px;
  color: #888;
}

.slug-extra-option {
  margin-top: 4px;
  padding-left: 12px;
}

/* 分类标签选择器样式 */
.taxonomy-group {
  margin-bottom: 20px;
}

.taxonomy-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 0;
  max-height: 150px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fafafa;
  min-height: 50px;
}

.taxonomy-item {
  padding: 6px 12px;
  background-color: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
  border-radius: 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.taxonomy-item:hover {
  background-color: #bae7ff;
  border-color: #69c0ff;
}

.taxonomy-item.selected {
  background-color: #1890ff;
  color: white;
  border-color: #1890ff;
}

.new-taxonomy {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.new-taxonomy input {
  flex: 1;
  min-width: 200px;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-style: italic;
  background-color: #fafafa;
  border-radius: 6px;
  border: 1px dashed #eaeaea;
}

/* 文章状态标签 */
.post-status {
  background-color: #e6f7ff;
  color: #1890ff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

/* 消息提示 */
.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.message.success {
  background-color: #67c23a;
}

.message.error {
  background-color: #f56c6c;
}

.message.info {
  background-color: #909399;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.close-btn:hover {
  opacity: 1;
}

/* 登录状态样式 */
.login-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
}

.login-status.logged-in {
  background-color: #d4edda;
  border-color: #28a745;
}

.login-status .status-icon {
  font-size: 18px;
}

.login-status .status-text {
  font-size: 14px;
  color: #333;
}

/* 登录表单样式 */
.login-form {
  margin-top: 20px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 6px;
  border: 1px solid #eaeaea;
}

.login-form h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
}

/* 手动 Cookie 配置折叠区域 */
.manual-cookie-section {
  margin-top: 20px;
  padding: 12px 16px;
  background-color: #f5f5f5;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.manual-cookie-section summary {
  cursor: pointer;
  font-size: 14px;
  color: #666;
  user-select: none;
}

.manual-cookie-section summary:hover {
  color: #409eff;
}

.manual-cookie-section[open] > summary {
  margin-bottom: 12px;
}

/* 配置警告样式 */
.config-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  margin-bottom: 20px;
}

.config-warning .warning-icon {
  font-size: 18px;
}

.config-warning span {
  font-size: 14px;
  color: #856404;
}

/* iframe 登录框样式 */
.login-iframe-container {
  margin-top: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
}

.login-iframe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.login-iframe-header span {
  font-size: 13px;
  color: #666;
}

.login-iframe-header .close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.login-iframe-header .close-btn:hover {
  color: #333;
}

.login-iframe {
  width: 100%;
  height: 500px;
  border: none;
  display: block;
}

/* btn-link 样式 */
.btn-link {
  background: none;
  border: none;
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  text-decoration: underline;
}

.btn-link:hover {
  color: #66b1ff;
}

/* 授权状态卡片样式 */
.auth-status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
  background-color: #f9f9f9;
}

.auth-status-card.auth-valid {
  background-color: #e8f5e9;
  border-color: #4caf50;
}

.auth-status-card.auth-invalid {
  background-color: #ffebee;
  border-color: #f44336;
}

.auth-status-card.auth-unknown {
  background-color: #fff8e1;
  border-color: #ff9800;
}

.auth-status-icon {
  font-size: 32px;
  line-height: 1;
}

.auth-status-info {
  flex: 1;
}

.auth-status-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.auth-status-desc {
  font-size: 13px;
  color: #666;
}

.auth-status-actions {
  display: flex;
  gap: 8px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  border: none;
  background-color: #409eff;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small:hover:not(:disabled) {
  background-color: #66b1ff;
}

.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small.btn-danger {
  background-color: #f56c6c;
  color: white;
}

.btn-small.btn-danger:hover:not(:disabled) {
  background-color: #f78989;
}

.btn-primary-small {
  background-color: #409eff;
  border-color: #409eff;
  color: white;
}

.btn-primary-small:hover:not(:disabled) {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

/* 登录说明样式 */
.login-instructions {
  margin-top: 20px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 6px;
  border: 1px solid #eaeaea;
}

.login-instructions h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
}

.login-instructions ol {
  margin: 0 0 16px 0;
  padding-left: 20px;
}

.login-instructions li {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

/* Cookie 配置区域 */
.cookie-config-section {
  margin-top: 20px;
}

.cookie-config-section textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;
  resize: vertical;
  min-height: 80px;
}

.cookie-config-section textarea:focus {
  border-color: #409eff;
  outline: none;
}

.cookie-help {
  margin-top: 16px;
  padding: 16px;
  background-color: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 6px;
}

.cookie-help h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #409eff;
}

.cookie-help ol {
  margin: 0;
  padding-left: 20px;
}

.cookie-help li {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.6;
}

.cookie-help kbd {
  background-color: #ebeef5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: monospace;
  border: 1px solid #dcdfe6;
}

.cookie-help code {
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: monospace;
  color: #e6a23c;
}

/* 必填标记 */
.required {
  color: #f56c6c;
}

/* 修复按钮样式 - 确保文字可见 */
.btn-primary {
  background-color: #409eff;
  border: 1px solid #409eff;
  color: #ffffff !important;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.btn-primary:disabled {
  background-color: #a0cfff;
  border-color: #a0cfff;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #909399;
  border: 1px solid #909399;
  color: #ffffff !important;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #a6a9ad;
  border-color: #a6a9ad;
}

.btn-secondary:disabled {
  background-color: #c8c9cc;
  border-color: #c8c9cc;
  cursor: not-allowed;
}

.btn-outline {
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  color: #606266 !important;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-outline:hover:not(:disabled) {
  color: #409eff !important;
  border-color: #c6e2ff;
  background-color: #ecf5ff;
}

.btn-outline:disabled {
  color: #c0c4cc !important;
  background-color: #f5f7fa;
  cursor: not-allowed;
}

.btn-text {
  background: none;
  border: none;
  color: #409eff;
  cursor: pointer;
  font-size: inherit;
  padding: 0;
  text-decoration: underline;
}

.btn-text:hover:not(:disabled) {
  color: #66b1ff;
}

.btn-text:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

/* 自动登录区域 */
.auto-login-section {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
  margin-bottom: 16px;
}

.auto-login-section h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: white;
}

.auto-login-section .help-text {
  margin: 0 0 12px 0;
  font-size: 13px;
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.9);
}

.auto-login-section .btn-primary {
  background-color: white;
  color: #667eea !important;
  border-color: white;
}

.auto-login-section .btn-primary:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.9);
}

/* 分隔线 */
.divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #dcdfe6;
}

.divider span {
  padding: 0 16px;
  color: #909399;
  font-size: 13px;
}

/* Cookie 帮助折叠区域 */
.cookie-help-details {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.cookie-help-details summary {
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  user-select: none;
}

.cookie-help-details summary:hover {
  color: #409eff;
}

.cookie-help-details[open] > summary {
  margin-bottom: 12px;
}

.cookie-help-details ol {
  margin: 0;
  padding-left: 20px;
}

.cookie-help-details li {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.6;
}

.cookie-help-details kbd {
  background-color: #ebeef5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: monospace;
  border: 1px solid #dcdfe6;
}

.cookie-help-details code {
  background-color: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: monospace;
  color: #e6a23c;
}

/* 修复 taxonomy 样式问题 */
.new-taxonomy {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
}

.new-taxonomy input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 13px;
  color: var(--b3-theme-on-surface);
  background-color: var(--b3-theme-surface);
}

.new-taxonomy input:focus {
  border-color: var(--b3-theme-primary);
  outline: none;
}

.new-taxonomy button {
  padding: 6px 12px;
  white-space: nowrap;
  height: 32px; /* 确保与输入框对齐 */
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--b3-theme-primary);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.new-taxonomy button:hover {
  opacity: 0.9;
}

.taxonomy-item {
  color: var(--b3-theme-on-surface); /* 确保文字可见 */
}

.taxonomy-item.selected {
  background-color: var(--b3-theme-primary-light);
  color: var(--b3-theme-primary);
  border-color: var(--b3-theme-primary);
}
</style>